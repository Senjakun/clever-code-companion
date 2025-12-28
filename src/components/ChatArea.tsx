import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Sparkles, Code, Image, FileText } from "lucide-react";
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

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export function ChatArea({ messages, onSendMessage, isLoading }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const quickActions = [
    { icon: Code, label: "Generate code" },
    { icon: Image, label: "Create UI" },
    { icon: FileText, label: "Write docs" },
  ];

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--chat-bg))]">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 scrollbar-thin" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 glow-primary">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">How can I help you today?</h1>
              <p className="text-muted-foreground max-w-md mb-8">
                I can help you build web applications, write code, and answer questions about development.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="gap-2 bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30"
                    onClick={() => setInput(action.label)}
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium">U</span>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="bg-secondary rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-border bg-card shadow-lg transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Quine AI..."
              className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-4 pr-24 focus-visible:ring-0 text-sm"
              rows={1}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8 bg-primary hover:bg-primary/90 glow-primary"
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Quine AI can make mistakes. Review important information.
          </p>
        </div>
      </div>
    </div>
  );
}
