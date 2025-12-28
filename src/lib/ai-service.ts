import { AIProvider } from "@/components/SettingsModal";

const SYSTEM_PROMPT = `You are an expert code generator. When the user asks you to create something, generate clean, modern, production-ready code.

Rules:
1. Always use TypeScript and React with Tailwind CSS
2. Create complete, working components
3. Use modern best practices
4. Include helpful comments
5. Make the code beautiful and well-structured

When responding:
1. First briefly explain what you're creating (1-2 sentences)
2. Then provide the complete code in a code block

Format your code response like this:
\`\`\`tsx
// Your code here
\`\`\``;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateWithOpenAI(
  apiKey: string,
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

export async function generateWithGemini(
  apiKey: string,
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Add system instruction as first user message if needed
  contents.unshift({
    role: "user",
    parts: [{ text: SYSTEM_PROMPT }],
  });
  contents.splice(1, 0, {
    role: "model",
    parts: [{ text: "I understand. I'll generate clean, production-ready TypeScript/React code with Tailwind CSS." }],
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gemini API error");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Try to parse complete JSON objects from buffer
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim().startsWith("{") || line.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(line.replace(/^\[|\]$/g, "").trim());
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
        } catch {
          // Continue collecting buffer
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.replace(/^\[|\]$/g, "").trim());
      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) onChunk(text);
    } catch {
      // Ignore final parse errors
    }
  }
}

export async function generateCode(
  provider: AIProvider,
  apiKey: string,
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> {
  if (provider === "openai") {
    return generateWithOpenAI(apiKey, messages, onChunk);
  } else {
    return generateWithGemini(apiKey, messages, onChunk);
  }
}

export function extractCodeFromResponse(response: string): string | null {
  const codeBlockRegex = /```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    return matches.map((m) => m[1].trim()).join("\n\n");
  }
  
  return null;
}
