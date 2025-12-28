import { useState, useEffect } from "react";
import { Settings, Key, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export type AIProvider = "openai" | "gemini";

interface APIKeys {
  openai: string;
  gemini: string;
}

interface SettingsModalProps {
  onSettingsChange: (provider: AIProvider, keys: APIKeys) => void;
  currentProvider: AIProvider;
  currentKeys: APIKeys;
}

export function SettingsModal({ onSettingsChange, currentProvider, currentKeys }: SettingsModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(currentProvider);
  const [keys, setKeys] = useState<APIKeys>(currentKeys);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  useEffect(() => {
    setProvider(currentProvider);
    setKeys(currentKeys);
  }, [currentProvider, currentKeys]);

  const handleSave = () => {
    localStorage.setItem("ai_provider", provider);
    localStorage.setItem("api_keys", JSON.stringify(keys));
    onSettingsChange(provider, keys);
    setOpen(false);
    toast({
      title: "Settings saved",
      description: `Using ${provider === "openai" ? "OpenAI" : "Google Gemini"} for code generation.`,
    });
  };

  const isConfigured = provider === "openai" ? keys.openai.length > 0 : keys.gemini.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            AI Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI provider and API keys for code generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="flex items-center gap-2">
              OpenAI API Key
              {keys.openai && <Check className="h-3 w-3 text-green-500" />}
            </Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showOpenAI ? "text" : "password"}
                placeholder="sk-..."
                value={keys.openai}
                onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10"
                onClick={() => setShowOpenAI(!showOpenAI)}
              >
                {showOpenAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="flex items-center gap-2">
              Google Gemini API Key
              {keys.gemini && <Check className="h-3 w-3 text-green-500" />}
            </Label>
            <div className="relative">
              <Input
                id="gemini-key"
                type={showGemini ? "text" : "password"}
                placeholder="AIza..."
                value={keys.gemini}
                onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10"
                onClick={() => setShowGemini(!showGemini)}
              >
                {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Your API keys are stored locally in your browser and never sent to our servers.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isConfigured}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
