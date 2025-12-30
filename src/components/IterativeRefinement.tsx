import { useState } from "react";
import { Wrench, Sparkles, RefreshCw, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface IterativeRefinementProps {
  lastResponse: string;
  onRefine: (feedback: string, type: "fix" | "improve" | "custom") => void;
  isLoading?: boolean;
  hasFileChanges?: boolean;
}

export function IterativeRefinement({ 
  lastResponse, 
  onRefine, 
  isLoading,
  hasFileChanges 
}: IterativeRefinementProps) {
  const [customFeedback, setCustomFeedback] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [expanded, setExpanded] = useState(true);

  if (!lastResponse || !hasFileChanges) return null;

  const handleQuickAction = (type: "fix" | "improve") => {
    const prompts = {
      fix: "Please fix any issues, bugs, or errors in the code you just generated. Make sure it compiles and works correctly.",
      improve: "Please improve the code you just generated. Make it more efficient, cleaner, and follow best practices. Add better error handling if needed."
    };
    onRefine(prompts[type], type);
  };

  const handleCustomSubmit = () => {
    if (customFeedback.trim()) {
      onRefine(customFeedback.trim(), "custom");
      setCustomFeedback("");
      setShowCustomInput(false);
    }
  };

  const quickActions = [
    {
      id: "fix",
      label: "Fix This",
      icon: Wrench,
      description: "Fix bugs and errors",
      className: "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
    },
    {
      id: "improve",
      label: "Improve This", 
      icon: Sparkles,
      description: "Make it better",
      className: "bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
    },
    {
      id: "regenerate",
      label: "Regenerate",
      icon: RefreshCw,
      description: "Try again",
      className: "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">Iterative Refinement</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      if (action.id === "fix" || action.id === "improve") {
                        handleQuickAction(action.id);
                      } else {
                        onRefine("Please regenerate the code with a fresh approach.", "custom");
                      }
                    }}
                    className={cn(
                      "gap-1.5 h-9 text-xs font-medium transition-all",
                      action.className
                    )}
                  >
                    <action.icon className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    {action.label}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  className="gap-1.5 h-9 text-xs font-medium"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Custom Feedback
                </Button>
              </div>

              {/* Custom Feedback Input */}
              <AnimatePresence>
                {showCustomInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2"
                  >
                    <Textarea
                      value={customFeedback}
                      onChange={(e) => setCustomFeedback(e.target.value)}
                      placeholder="Tell me what to fix or improve..."
                      className="min-h-[80px] text-sm resize-none bg-muted/30 border-border/50"
                      disabled={isLoading}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomFeedback("");
                        }}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCustomSubmit}
                        disabled={!customFeedback.trim() || isLoading}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Apply Feedback
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tips */}
              <p className="text-xs text-muted-foreground">
                💡 Use "Fix This" for bugs, "Improve This" for optimization, or provide custom feedback.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
