// AI Generation Hook with Fallback, Retry, and Error Recovery

import { useState, useCallback, useRef } from "react";
import { AIModel, getDefaultModel, getModelById } from "@/lib/ai-config";
import { buildSmartContext } from "@/lib/context-manager";
import { validateFileChanges, ValidationResult } from "@/lib/code-validator";
import { FileNode } from "@/lib/file-system";
import { useToast } from "@/hooks/use-toast";

export interface GenerationResult {
  success: boolean;
  content: string;
  model: AIModel;
  validationResults?: ValidationResult[];
  retryCount: number;
  duration: number;
}

export interface GenerationOptions {
  modelId?: string;
  enableFallback?: boolean;
  maxRetries?: number;
  validateCode?: boolean;
  onProgress?: (chunk: string, fullContent: string) => void;
}

const FALLBACK_ORDER = [
  "lovable/gemini-2.5-flash",
  "lovable/gpt-5-mini",
  "lovable/gemini-2.5-pro",
];

export function useAIGeneration() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModel>(getDefaultModel());
  const [lastError, setLastError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parseFileChanges = (response: string): { filePath: string; content: string }[] => {
    const changes: { filePath: string; content: string }[] = [];
    const fileRegex = /===FILE:\s*(.+?)===\s*```\w*\n([\s\S]*?)```\s*===END_FILE===/g;

    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      changes.push({
        filePath: match[1].trim(),
        content: match[2].trim(),
      });
    }

    return changes;
  };

  const generate = useCallback(
    async (
      userMessage: string,
      files: FileNode[],
      activeFileId: string | null,
      options: GenerationOptions = {}
    ): Promise<GenerationResult> => {
      const {
        modelId,
        enableFallback = true,
        maxRetries = 2,
        validateCode = true,
        onProgress,
      } = options;

      const startTime = Date.now();
      setIsGenerating(true);
      setLastError(null);

      // Get the model to use
      let model = modelId ? getModelById(modelId) : currentModel;
      if (!model) model = getDefaultModel();

      setCurrentModel(model);

      // Build smart context
      const context = buildSmartContext(files, activeFileId, userMessage, {
        maxTokens: Math.min(model.contextWindow * 0.6, 60000), // Use 60% of context window
        includeImports: true,
        prioritizeActiveFile: true,
        includeRecentChanges: true,
      });

      const systemPrompt = `You are an expert AI code assistant integrated into a code editor called Quine AI. You help users build web applications by modifying and creating files.

${context}

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
- Use modern best practices (hooks, functional components)
- Make the code beautiful and functional
- For new files in src folder, use format: src/filename.tsx
- Always update App.tsx to use new components if needed
- Use Shadcn UI components when available
- Handle errors gracefully`;

      const fullPrompt = `## User Request:\n${userMessage}`;

      let retryCount = 0;
      let lastAttemptError: string | null = null;

      // Try with fallback models
      const modelsToTry = enableFallback
        ? [model.id, ...FALLBACK_ORDER.filter((id) => id !== model.id)]
        : [model.id];

      for (const tryModelId of modelsToTry) {
        const tryModel = getModelById(tryModelId);
        if (!tryModel) continue;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            abortControllerRef.current = new AbortController();

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: fullPrompt },
                  ],
                  provider: tryModel.provider === "lovable" ? "lovable" : tryModel.provider,
                  model: tryModel.id,
                }),
                signal: abortControllerRef.current.signal,
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            let fullContent = "";
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              let newlineIndex: number;
              while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                let line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (line.startsWith(":") || line.trim() === "") continue;
                if (!line.startsWith("data: ")) continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") break;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const text = parsed.choices?.[0]?.delta?.content;
                  if (text) {
                    fullContent += text;
                    onProgress?.(text, fullContent);
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }

            // Validate generated code
            let validationResults: ValidationResult[] | undefined;
            if (validateCode) {
              const changes = parseFileChanges(fullContent);
              if (changes.length > 0) {
                validationResults = validateFileChanges(changes);
                const hasErrors = validationResults.some((r) => !r.isValid);

                if (hasErrors) {
                  const errorMessages = validationResults
                    .flatMap((r) => r.errors)
                    .map((e) => e.message)
                    .slice(0, 3)
                    .join(", ");

                  toast({
                    title: "Code validation warnings",
                    description: errorMessages,
                    variant: "destructive",
                  });
                }
              }
            }

            setIsGenerating(false);
            return {
              success: true,
              content: fullContent,
              model: tryModel,
              validationResults,
              retryCount,
              duration: Date.now() - startTime,
            };
          } catch (error) {
            retryCount++;
            lastAttemptError = error instanceof Error ? error.message : "Unknown error";
            console.error(`Generation attempt ${attempt + 1} failed:`, lastAttemptError);

            if (attempt < maxRetries) {
              // Wait before retry (exponential backoff)
              await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
          }
        }

        // If this model failed, try next in fallback order
        if (enableFallback) {
          toast({
            title: `Switching model`,
            description: `${tryModel.name} failed, trying next...`,
          });
        }
      }

      // All attempts failed
      setLastError(lastAttemptError);
      setIsGenerating(false);

      return {
        success: false,
        content: "",
        model,
        retryCount,
        duration: Date.now() - startTime,
      };
    },
    [currentModel, toast]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  return {
    generate,
    cancel,
    isGenerating,
    currentModel,
    setCurrentModel,
    lastError,
  };
}
