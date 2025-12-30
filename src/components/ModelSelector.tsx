import { Cpu, Sparkles, Zap, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AI_MODELS, AIModel, getLovableModels, getCustomModels } from "@/lib/ai-config";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const getModelIcon = (modelId: string) => {
  if (modelId.includes("pro") || modelId.includes("gpt-5")) {
    return <Crown className="h-3.5 w-3.5 text-amber-500" />;
  }
  if (modelId.includes("flash") || modelId.includes("mini")) {
    return <Zap className="h-3.5 w-3.5 text-blue-500" />;
  }
  return <Cpu className="h-3.5 w-3.5 text-muted-foreground" />;
};

export function ModelSelector({ value, onValueChange, disabled, className }: ModelSelectorProps) {
  const lovableModels = getLovableModels();
  const customModels = getCustomModels();
  const selectedModel = AI_MODELS.find((m) => m.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[200px] h-8 text-xs", className)}>
        <div className="flex items-center gap-2">
          {selectedModel && getModelIcon(selectedModel.id)}
          <SelectValue placeholder="Select model">
            {selectedModel?.name.replace(" (Lovable)", "").replace(" (Custom Key)", "")}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Lovable AI (No Key Needed)
          </SelectLabel>
          {lovableModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="py-2">
              <div className="flex items-center gap-2">
                {getModelIcon(model.id)}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {model.name.replace(" (Lovable)", "")}
                  </span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
                {model.isDefault && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-4">
                    Default
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectGroup>

        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-muted-foreground mt-2">
            <Cpu className="h-3.5 w-3.5" />
            Custom API Keys
          </SelectLabel>
          {customModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="py-2">
              <div className="flex items-center gap-2">
                {getModelIcon(model.id)}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {model.name.replace(" (Custom Key)", "")}
                  </span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
