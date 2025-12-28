import { useState } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatArea } from "@/components/ChatArea";
import { PreviewPanel } from "@/components/PreviewPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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

const Index = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "Building a dashboard", timestamp: new Date(), isActive: true },
    { id: "2", title: "API integration help", timestamp: new Date(Date.now() - 86400000) },
    { id: "3", title: "React component design", timestamp: new Date(Date.now() - 172800000) },
  ]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
  };

  const handleSelectChat = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => ({ ...s, isActive: s.id === id }))
    );
    setMessages([]);
  };

  const handleDeleteChat = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (messages.length === 0) {
      setSessions((prev) =>
        prev.map((s) =>
          s.isActive ? { ...s, title: content.slice(0, 30) + (content.length > 30 ? "..." : "") } : s
        )
      );
    }

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm here to help you build amazing web applications! This is a demo response. In a real implementation, this would be connected to an AI backend.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden dark">
      <ChatSidebar
        sessions={sessions}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
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
          <PreviewPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
