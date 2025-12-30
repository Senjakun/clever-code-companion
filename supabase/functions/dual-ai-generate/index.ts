import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt for the Architect (GPT)
const ARCHITECT_PROMPT = `You are a senior software architect working on a professional code editor. Your role is to:

1. Analyze user requirements thoroughly
2. Design clean, scalable architecture
3. Generate high-quality code following best practices
4. Use TypeScript, React, and Tailwind CSS
5. Create modular, reusable components

## Response Format:
When creating code, use this EXACT format:

===FILE: path/to/file.tsx===
\`\`\`tsx
// Complete file content
\`\`\`
===END_FILE===

## Standards:
- TypeScript with proper types
- React functional components with hooks
- Tailwind CSS for styling
- Shadcn UI components when available
- Error handling and edge cases
- Accessibility (ARIA, semantic HTML)
- Performance optimization

Always provide COMPLETE file contents.`;

// System prompt for the Reviewer (Gemini)
const REVIEWER_PROMPT = `You are a senior code reviewer. Your job is to:

1. Review the code provided by the architect
2. Identify bugs, security issues, and performance problems
3. Suggest improvements for code quality
4. Ensure best practices are followed
5. OUTPUT THE IMPROVED CODE in the same format

## Your Review Process:
1. Check for TypeScript type safety
2. Verify React best practices (hooks usage, state management)
3. Review Tailwind classes for consistency
4. Look for security vulnerabilities
5. Check accessibility compliance
6. Verify error handling

## Output Format:
Start with a brief review summary (2-3 lines max), then output the improved code:

===FILE: path/to/file.tsx===
\`\`\`tsx
// Improved file content with fixes
\`\`\`
===END_FILE===

If the code is already good, output it unchanged but add minor improvements if possible.
IMPORTANT: Always output complete file contents, never partial.`;

interface Message {
  role: string;
  content: string;
}

async function callLovableAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function streamLovableAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  prefix?: string
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  // Send prefix if provided
  if (prefix) {
    const sseData = { choices: [{ delta: { content: prefix } }] };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let buffer = "";

  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullContent += content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return fullContent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "dual" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Lovable AI not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Models for the pipeline
    const architectModel = "openai/gpt-5"; // GPT as architect
    const reviewerModel = "google/gemini-2.5-pro"; // Gemini as reviewer

    if (mode === "architect-only") {
      // Single pass with GPT
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: architectModel,
          messages: [
            { role: "system", content: ARCHITECT_PROMPT },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error("Architect AI failed");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (mode === "reviewer-only") {
      // Single pass with Gemini
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: reviewerModel,
          messages: [
            { role: "system", content: REVIEWER_PROMPT },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error("Reviewer AI failed");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // DUAL MODE: GPT generates → Gemini reviews
    console.log("Starting Dual AI Pipeline: GPT-5 (Architect) → Gemini 2.5 Pro (Reviewer)");

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Phase 1: Stream progress message
          const phase1Msg = "🏗️ **Phase 1: Architect (GPT-5) generating code...**\n\n";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: phase1Msg } }] })}\n\n`));

          // Call architect (GPT) - non-streaming to get full response
          console.log("Calling GPT-5 Architect...");
          const architectResponse = await callLovableAI(
            LOVABLE_API_KEY,
            architectModel,
            ARCHITECT_PROMPT,
            messages
          );

          console.log("Architect response received, length:", architectResponse.length);

          // Stream the architect's response
          const chunkSize = 50;
          for (let i = 0; i < architectResponse.length; i += chunkSize) {
            const chunk = architectResponse.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
            // Small delay for smooth streaming effect
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Phase 2: Review
          const phase2Msg = "\n\n---\n\n🔍 **Phase 2: Reviewer (Gemini 2.5 Pro) improving code...**\n\n";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: phase2Msg } }] })}\n\n`));

          // Call reviewer (Gemini) with architect's output
          console.log("Calling Gemini 2.5 Pro Reviewer...");
          const reviewerResponse = await callLovableAI(
            LOVABLE_API_KEY,
            reviewerModel,
            REVIEWER_PROMPT,
            [
              { role: "user", content: `Original request: ${messages[messages.length - 1]?.content}\n\nArchitect's code:\n${architectResponse}\n\nPlease review and improve this code.` }
            ]
          );

          console.log("Reviewer response received, length:", reviewerResponse.length);

          // Stream the reviewer's response
          for (let i = 0; i < reviewerResponse.length; i += chunkSize) {
            const chunk = reviewerResponse.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Final message
          const finalMsg = "\n\n✅ **Dual AI Pipeline Complete!**";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: finalMsg } }] })}\n\n`));

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Dual AI Pipeline error:", error);
          const errorMsg = `\n\n❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMsg } }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Dual AI function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
