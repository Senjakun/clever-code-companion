// Smart Context Management for AI

import { FileNode, getAllFiles } from "@/lib/file-system";

export interface ContextOptions {
  maxTokens: number;
  includeImports: boolean;
  prioritizeActiveFile: boolean;
  includeRecentChanges: boolean;
}

export interface FileContext {
  path: string;
  content: string;
  relevanceScore: number;
  tokenCount: number;
}

// Approximate token count (rough estimate: 1 token ≈ 4 characters)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Calculate relevance score for a file based on various factors
function calculateRelevanceScore(
  file: FileNode,
  activeFileId: string | null,
  userMessage: string,
  recentlyModified: string[]
): number {
  let score = 0;

  // Higher score for active file
  if (file.id === activeFileId) {
    score += 100;
  }

  // Higher score for recently modified files
  if (recentlyModified.includes(file.id)) {
    score += 50;
  }

  // Higher score if file is mentioned in user message
  const fileName = file.name.toLowerCase();
  const filePath = file.id.toLowerCase();
  const messageLower = userMessage.toLowerCase();

  if (messageLower.includes(fileName) || messageLower.includes(filePath)) {
    score += 80;
  }

  // Higher score for important file types
  if (file.name === "App.tsx" || file.name === "index.tsx") {
    score += 30;
  }

  // Score based on file type
  if (file.language === "tsx" || file.language === "typescript") {
    score += 20;
  }

  // Reduce score for large files
  const tokenCount = estimateTokens(file.content || "");
  if (tokenCount > 2000) {
    score -= 10;
  }

  // Check for imports in user message context
  if (file.content) {
    // If the user mentions something that this file exports
    const exportMatches = file.content.match(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g);
    if (exportMatches) {
      exportMatches.forEach((match) => {
        const name = match.split(/\s+/).pop();
        if (name && messageLower.includes(name.toLowerCase())) {
          score += 40;
        }
      });
    }
  }

  return Math.max(0, score);
}

// Build optimized context for AI
export function buildSmartContext(
  files: FileNode[],
  activeFileId: string | null,
  userMessage: string,
  options: ContextOptions = {
    maxTokens: 32000,
    includeImports: true,
    prioritizeActiveFile: true,
    includeRecentChanges: true,
  }
): string {
  const allFiles = getAllFiles(files);
  const recentlyModified: string[] = []; // Could be tracked in state

  // Calculate relevance scores
  const fileContexts: FileContext[] = allFiles
    .filter((f) => f.type === "file" && f.content)
    .map((file) => ({
      path: file.id,
      content: file.content || "",
      relevanceScore: calculateRelevanceScore(file, activeFileId, userMessage, recentlyModified),
      tokenCount: estimateTokens(file.content || ""),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Build context within token limit
  let totalTokens = 0;
  const includedFiles: FileContext[] = [];
  const fileList: string[] = [];

  for (const file of fileContexts) {
    if (totalTokens + file.tokenCount > options.maxTokens) {
      // Skip if adding this file would exceed limit
      // But always include active file
      if (file.path === activeFileId && options.prioritizeActiveFile) {
        includedFiles.push(file);
        totalTokens += file.tokenCount;
      }
      continue;
    }

    includedFiles.push(file);
    totalTokens += file.tokenCount;
  }

  // Build all file list (for reference)
  allFiles.forEach((f) => {
    if (f.type === "file") {
      const included = includedFiles.some((inc) => inc.path === f.id);
      fileList.push(`${included ? "✓" : "○"} ${f.id}`);
    }
  });

  // Build context string
  const contextParts: string[] = [
    `## Project Structure (${allFiles.filter((f) => f.type === "file").length} files)`,
    fileList.join("\n"),
    "",
    `## File Contents (${includedFiles.length} files, ~${totalTokens} tokens)`,
  ];

  includedFiles.forEach((file) => {
    const ext = file.path.split(".").pop() || "txt";
    contextParts.push(`\n### ${file.path}`);
    contextParts.push("```" + ext);
    contextParts.push(file.content);
    contextParts.push("```");
  });

  return contextParts.join("\n");
}

// Extract mentioned file paths from user message
export function extractMentionedFiles(message: string, files: FileNode[]): string[] {
  const allFiles = getAllFiles(files);
  const mentioned: string[] = [];
  const messageLower = message.toLowerCase();

  allFiles.forEach((file) => {
    if (file.type === "file") {
      const nameLower = file.name.toLowerCase();
      const pathLower = file.id.toLowerCase();

      if (messageLower.includes(nameLower) || messageLower.includes(pathLower)) {
        mentioned.push(file.id);
      }
    }
  });

  return mentioned;
}

// Detect if user is asking about specific files
export function detectFileIntent(message: string): { action: string; filePatterns: string[] } {
  const actions = {
    create: /create|add|new|make/i,
    modify: /update|change|modify|edit|fix/i,
    delete: /delete|remove|drop/i,
    view: /show|display|view|see/i,
  };

  let detectedAction = "modify";
  for (const [action, pattern] of Object.entries(actions)) {
    if (pattern.test(message)) {
      detectedAction = action;
      break;
    }
  }

  // Extract file patterns
  const filePatterns: string[] = [];
  const filePattern = /(?:file|component|page|hook)\s+(?:called\s+)?["']?(\w+(?:\.\w+)?)["']?/gi;
  let match;
  while ((match = filePattern.exec(message)) !== null) {
    filePatterns.push(match[1]);
  }

  return { action: detectedAction, filePatterns };
}
