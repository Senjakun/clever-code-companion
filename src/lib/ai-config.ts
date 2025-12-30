// AI Configuration and Model Definitions

export type AIProvider = "openai" | "gemini" | "lovable";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  contextWindow: number;
  isDefault?: boolean;
}

export const AI_MODELS: AIModel[] = [
  // Lovable AI Gateway (No API key needed)
  {
    id: "lovable/gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Lovable)",
    provider: "lovable",
    description: "Fast & balanced - recommended for most use cases",
    maxTokens: 8192,
    contextWindow: 128000,
    isDefault: true,
  },
  {
    id: "lovable/gemini-2.5-pro",
    name: "Gemini 2.5 Pro (Lovable)",
    provider: "lovable",
    description: "Most capable for complex reasoning",
    maxTokens: 8192,
    contextWindow: 200000,
  },
  {
    id: "lovable/gpt-5",
    name: "GPT-5 (Lovable)",
    provider: "lovable",
    description: "Powerful all-rounder with excellent reasoning",
    maxTokens: 16384,
    contextWindow: 200000,
  },
  {
    id: "lovable/gpt-5-mini",
    name: "GPT-5 Mini (Lovable)",
    provider: "lovable",
    description: "Good balance of cost and performance",
    maxTokens: 16384,
    contextWindow: 128000,
  },
  // Custom API Keys
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (Custom Key)",
    provider: "openai",
    description: "OpenAI's latest model - requires API key",
    maxTokens: 16384,
    contextWindow: 128000,
  },
  {
    id: "gemini/gemini-1.5-pro",
    name: "Gemini 1.5 Pro (Custom Key)",
    provider: "gemini",
    description: "Google's Gemini - requires API key",
    maxTokens: 8192,
    contextWindow: 128000,
  },
];

export const getDefaultModel = (): AIModel => {
  return AI_MODELS.find((m) => m.isDefault) || AI_MODELS[0];
};

export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS.find((m) => m.id === id);
};

export const getLovableModels = (): AIModel[] => {
  return AI_MODELS.filter((m) => m.provider === "lovable");
};

export const getCustomModels = (): AIModel[] => {
  return AI_MODELS.filter((m) => m.provider !== "lovable");
};
