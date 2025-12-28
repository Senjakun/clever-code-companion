import { AIProvider } from "@/components/SettingsModal";
import { FileNode, getAllFiles } from "@/lib/file-system";

const createSystemPrompt = (files: FileNode[]) => {
  const allFiles = getAllFiles(files);
  const fileList = allFiles.map((f) => `- ${f.id}`).join("\n");
  const fileContents = allFiles
    .map((f) => `### ${f.id}\n\`\`\`${f.language || "text"}\n${f.content}\n\`\`\``)
    .join("\n\n");

  return `You are an expert AI code assistant integrated into a code editor. You help users build web applications by modifying and creating files.

## Current Project Files:
${fileList}

## File Contents:
${fileContents}

## Instructions:
When the user asks you to create or modify code:

1. First, briefly explain what you're going to do (1-2 sentences max)
2. Then output file changes in this EXACT format:

===FILE: path/to/file.tsx===
\`\`\`tsx
// Complete file content here
\`\`\`
===END_FILE===

Rules:
- Use TypeScript and React with Tailwind CSS
- Always provide COMPLETE file contents, not partial
- You can modify existing files or create new ones
- Use modern best practices
- Make the code beautiful and functional
- For new files in src folder, use format: src/filename.tsx
- Always update App.tsx to use new components

Example response:
I'll create a new Button component and update App.tsx to use it.

===FILE: src/components/Button.tsx===
\`\`\`tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
    >
      {children}
    </button>
  );
}
\`\`\`
===END_FILE===

===FILE: src/App.tsx===
\`\`\`tsx
import React from 'react';
import { Button } from './components/Button';

export default function App() {
  return (
    <div className="p-8">
      <Button>Click me!</Button>
    </div>
  );
}
\`\`\`
===END_FILE===`;
};

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
      messages,
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?key=${apiKey}`,
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
  userMessage: string,
  files: FileNode[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const systemPrompt = createSystemPrompt(files);
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  if (provider === "openai") {
    return generateWithOpenAI(apiKey, messages, onChunk);
  } else {
    // For Gemini, prepend system prompt to user message
    const geminiMessages: Message[] = [
      { role: "user", content: systemPrompt + "\n\nUser request: " + userMessage },
    ];
    return generateWithGemini(apiKey, geminiMessages, onChunk);
  }
}

export interface ParsedFileChange {
  filePath: string;
  content: string;
}

export function parseFileChanges(response: string): ParsedFileChange[] {
  const changes: ParsedFileChange[] = [];
  const fileRegex = /===FILE:\s*(.+?)===\s*```\w*\n([\s\S]*?)```\s*===END_FILE===/g;
  
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    changes.push({
      filePath: match[1].trim(),
      content: match[2].trim(),
    });
  }
  
  return changes;
}

export function extractCodeFromResponse(response: string): string | null {
  const codeBlockRegex = /```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    return matches.map((m) => m[1].trim()).join("\n\n");
  }
  
  return null;
}
