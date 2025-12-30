import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced system prompt for better code generation
const SYSTEM_PROMPT = `You are an expert AI code assistant integrated into Quine AI, a professional code editor. You help users build modern web applications.

## Your Capabilities:
- Create and modify React/TypeScript/Tailwind files
- Build beautiful, responsive UI components
- Implement complex business logic
- Follow best practices and modern patterns

## Response Format:
When creating or modifying code, use this EXACT format:

===FILE: path/to/file.tsx===
\`\`\`tsx
// Complete file content here
\`\`\`
===END_FILE===

## Coding Standards:
1. **TypeScript**: Use proper types, interfaces, and generics
2. **React**: Functional components with hooks, proper state management
3. **Tailwind CSS**: Use utility classes, semantic colors from design system
4. **Components**: Small, focused, reusable with clear props
5. **Error Handling**: Try-catch, error boundaries, user-friendly messages
6. **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
7. **Performance**: Memoization, lazy loading, efficient re-renders

## File Structure:
- src/components/ - Reusable UI components
- src/pages/ - Route pages
- src/hooks/ - Custom React hooks
- src/lib/ - Utility functions
- src/contexts/ - React contexts

## Important Rules:
- Always provide COMPLETE file contents, never partial
- Include all necessary imports
- Make code beautiful AND functional
- Use Shadcn UI components when available (Button, Card, Input, etc.)
- Follow the existing project patterns
- Handle edge cases gracefully`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, provider = "lovable", model: requestedModel } = await req.json();

    // Get API key from database for custom providers
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which API to use based on provider
    if (provider === "lovable" || !provider) {
      // Use Lovable AI Gateway (default)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Lovable AI not configured. Contact administrator." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine model - extract the actual model from the ID
      let modelToUse = "google/gemini-2.5-flash"; // default
      if (requestedModel) {
        if (requestedModel.includes("gemini-2.5-pro")) {
          modelToUse = "google/gemini-2.5-pro";
        } else if (requestedModel.includes("gemini-2.5-flash")) {
          modelToUse = "google/gemini-2.5-flash";
        } else if (requestedModel.includes("gpt-5-mini")) {
          modelToUse = "openai/gpt-5-mini";
        } else if (requestedModel.includes("gpt-5")) {
          modelToUse = "openai/gpt-5";
        }
      }

      console.log("Using Lovable AI with model:", modelToUse);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();
        console.error("Lovable AI error:", status, errorText);

        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "Credits exhausted. Please add credits to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Trying fallback..." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Custom API key flow for OpenAI or Gemini
    const providerKey = provider === "openai" ? "openai" : "gemini";
    const { data: apiKeyData, error: keyError } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("key_name", providerKey)
      .maybeSingle();

    if (keyError || !apiKeyData?.key_value) {
      // Fallback to Lovable AI if no custom key
      console.log("No custom API key found, falling back to Lovable AI");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "No API key configured. Please add API keys in Admin settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fallback Lovable AI error:", errorText);
        return new Response(
          JSON.stringify({ error: "AI service error. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Use custom API key
    const apiKey = apiKeyData.key_value;

    if (provider === "openai") {
      console.log("Using custom OpenAI API key");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI error:", error);
        return new Response(
          JSON.stringify({ error: "OpenAI API error. Check your API key." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Gemini with custom key
      console.log("Using custom Gemini API key");
      const contents = messages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.role === "system" ? SYSTEM_PROMPT + "\n\n" + msg.content : msg.content }],
      }));

      // Add system prompt as first user message for Gemini
      const geminiContents = [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "I understand. I will follow these guidelines for all code generation." }] },
        ...contents,
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Gemini error:", error);
        return new Response(
          JSON.stringify({ error: "Gemini API error. Check your API key." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Transform Gemini response to OpenAI-compatible SSE format
      const reader = response.body?.getReader();
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              // Parse Gemini's JSON array response
              try {
                const lines = buffer.split("\n");
                for (const line of lines) {
                  if (line.trim().startsWith("{") || line.trim().startsWith("[")) {
                    const cleanLine = line.replace(/^\[|\]$/g, "").trim();
                    if (cleanLine) {
                      const parsed = JSON.parse(cleanLine.replace(/^,/, ""));
                      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (text) {
                        // Convert to OpenAI SSE format
                        const sseData = {
                          choices: [{ delta: { content: text } }],
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
                      }
                    }
                  }
                }
                buffer = "";
              } catch {
                // Keep buffer for next chunk
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
