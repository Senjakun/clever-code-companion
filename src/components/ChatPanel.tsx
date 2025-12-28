import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <ScrollArea className="flex-1 px-4 scrollbar-thin" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-[200px] text-center"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 glow-primary">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Describe what you want to build and I'll generate the code
              </p>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                    {message.content.split("===FILE:")[0].trim() || message.content}
                  </p>
                </div>
              </motion.div>
            ))
          )}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 justify-start"
            >
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <div className="relative rounded-xl border border-border bg-card shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="min-h-[60px] max-h-[120px] resize-none border-0 bg-transparent px-3 py-2.5 pr-20 focus-visible:ring-0 text-sm"
            rows={2}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
