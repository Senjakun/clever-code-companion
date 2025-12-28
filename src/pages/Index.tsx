import { useState, useEffect } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatArea } from "@/components/ChatArea";
import { PreviewPanel } from "@/components/PreviewPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AIProvider } from "@/components/SettingsModal";
import { generateCode, extractCodeFromResponse } from "@/lib/ai-service";
import { useToast } from "@/hooks/use-toast";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  isActive?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface APIKeys {
  openai: string;
  gemini: string;
}

const Index = () => {
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "New conversation", timestamp: new Date(), isActive: true },
  ]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  
  // AI Settings
  const [provider, setProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem("ai_provider") as AIProvider) || "openai";
  });
  
  const [apiKeys, setApiKeys] = useState<APIKeys>(() => {
    const saved = localStorage.getItem("api_keys");
    return saved ? JSON.parse(saved) : { openai: "", gemini: "" };
  });

  const handleSettingsChange = (newProvider: AIProvider, newKeys: APIKeys) => {
    setProvider(newProvider);
    setApiKeys(newKeys);
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New conversation",
      timestamp: new Date(),
      isActive: true,
    };
    setSessions((prev) =>
      [newSession, ...prev.map((s) => ({ ...s, isActive: false }))]
    );
    setMessages([]);
    setGeneratedCode("");
  };

  const handleSelectChat = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => ({ ...s, isActive: s.id === id }))
    );
    setMessages([]);
    setGeneratedCode("");
  };

  const handleDeleteChat = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSendMessage = async (content: string) => {
    const currentApiKey = provider === "openai" ? apiKeys.openai : apiKeys.gemini;
    
    if (!currentApiKey) {
      toast({
        title: "API Key Required",
        description: `Please add your ${provider === "openai" ? "OpenAI" : "Gemini"} API key in settings.`,
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Update session title
    if (messages.length === 0) {
      setSessions((prev) =>
        prev.map((s) =>
          s.isActive ? { ...s, title: content.slice(0, 30) + (content.length > 30 ? "..." : "") } : s
        )
      );
    }

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    let fullResponse = "";

    try {
      await generateCode(
        provider,
        currentApiKey,
        [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullResponse } : m
            )
          );
          
          // Extract and update code
          const code = extractCodeFromResponse(fullResponse);
          if (code) {
            setGeneratedCode(code);
          }
        }
      );
    } catch (error) {
      console.error("AI error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate response",
        variant: "destructive",
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Sorry, I encountered an error. Please check your API key and try again." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden dark">
      <ChatSidebar
        sessions={sessions}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        currentProvider={provider}
        currentKeys={apiKeys}
        onSettingsChange={handleSettingsChange}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={30}>
          <ChatArea
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />
        
        <ResizablePanel defaultSize={60} minSize={30}>
          <PreviewPanel code={generatedCode} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
