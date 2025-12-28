import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { MonacoEditor } from "@/components/MonacoEditor";
import { EditorTabs } from "@/components/EditorTabs";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DiffView } from "@/components/DiffView";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AIProvider } from "@/components/SettingsModal";
import { useFileSystem } from "@/hooks/useFileSystem";
import { generateCode, parseFileChanges } from "@/lib/ai-service";
import { useToast } from "@/hooks/use-toast";
import { findFileById, FileChange } from "@/lib/file-system";

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
  const fileSystem = useFileSystem();
  
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "New conversation", timestamp: new Date(), isActive: true },
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [provider, setProvider] = useState<AIProvider>(() => 
    (localStorage.getItem("ai_provider") as AIProvider) || "openai"
  );
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
    setSessions((prev) => [newSession, ...prev.map((s) => ({ ...s, isActive: false }))]);
    setMessages([]);
  };

  const handleSelectChat = (id: string) => {
    setSessions((prev) => prev.map((s) => ({ ...s, isActive: s.id === id })));
  };

  const handleDeleteChat = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateFile = (parentId: string | null) => {
    const name = prompt("Enter file name:");
    if (name) fileSystem.createFile(parentId, name);
  };

  const handleSendMessage = async (content: string) => {
    const currentApiKey = provider === "openai" ? apiKeys.openai : apiKeys.gemini;
    
    if (!currentApiKey) {
      toast({ title: "API Key Required", description: "Add your API key in settings.", variant: "destructive" });
      return;
    }

    const userMessage: Message = { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (messages.length === 0) {
      setSessions((prev) => prev.map((s) => s.isActive ? { ...s, title: content.slice(0, 30) } : s));
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

    let fullResponse = "";

    try {
      await generateCode(provider, currentApiKey, content, fileSystem.files, (chunk) => {
        fullResponse += chunk;
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullResponse } : m));
      });

      // Parse file changes and add as pending
      const changes = parseFileChanges(fullResponse);
      changes.forEach((change) => {
        const existingFile = findFileById(fileSystem.files, change.filePath);
        const fileChange: FileChange = {
          fileId: change.filePath,
          fileName: change.filePath.split("/").pop() || change.filePath,
          oldContent: existingFile?.content || "",
          newContent: change.content,
          type: existingFile ? "modify" : "create",
        };
        fileSystem.addPendingChange(fileChange);
      });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to generate", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden dark">
      <LeftSidebar
        files={fileSystem.files}
        activeFileId={fileSystem.activeFileId}
        sessions={sessions}
        currentProvider={provider}
        currentKeys={apiKeys}
        onFileSelect={fileSystem.openFile}
        onToggleFolder={fileSystem.toggleFolder}
        onCreateFile={handleCreateFile}
        onDeleteFile={fileSystem.removeFile}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onSettingsChange={handleSettingsChange}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15}>
          <ChatPanel messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="h-full flex flex-col bg-[#1e1e1e]">
            <EditorTabs
              tabs={fileSystem.openTabs}
              activeTab={fileSystem.activeFileId}
              onSelectTab={fileSystem.openFile}
              onCloseTab={fileSystem.closeTab}
            />
            <div className="flex-1">
              <MonacoEditor
                value={fileSystem.activeFile?.content || "// Select a file to edit"}
                language={fileSystem.activeFile?.language || "typescript"}
                onChange={(val) => fileSystem.activeFileId && fileSystem.updateFile(fileSystem.activeFileId, val)}
              />
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={40} minSize={25}>
          <PreviewPanel files={fileSystem.files} code={fileSystem.activeFile?.content} />
        </ResizablePanel>
      </ResizablePanelGroup>

      <AnimatePresence>
        {fileSystem.pendingChanges.length > 0 && (
          <DiffView
            changes={fileSystem.pendingChanges}
            onApply={fileSystem.applyChanges}
            onDiscard={fileSystem.discardChanges}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
