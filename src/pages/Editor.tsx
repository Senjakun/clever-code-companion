import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Github } from "lucide-react";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { MonacoEditor } from "@/components/MonacoEditor";
import { EditorTabs } from "@/components/EditorTabs";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DiffView } from "@/components/DiffView";
import { UserMenu } from "@/components/UserMenu";
import { CreditBlockModal } from "@/components/CreditBlockModal";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

export default function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, credits, loading: authLoading } = useAuthContext();
  const fileSystem = useFileSystem();

  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "New conversation", timestamp: new Date(), isActive: true },
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreditBlock, setShowCreditBlock] = useState(false);
  const [showGithubSync, setShowGithubSync] = useState(false);
  const [projectName, setProjectName] = useState("Project");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    
    if (data) {
      setProjectName(data.name);
    }
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

  const parseFileChanges = (response: string) => {
    const changes: { filePath: string; content: string }[] = [];
    const fileRegex = /===FILE:\s*(.+?)===\s*```\w*\n([\s\S]*?)```\s*===END_FILE===/g;
    
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      changes.push({
        filePath: match[1].trim(),
        content: match[2].trim(),
      });
    }
    
    return changes;
  };

  const handleSendMessage = async (content: string) => {
    // Check credits
    if (credits <= 0) {
      setShowCreditBlock(true);
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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content }],
          provider: "gemini",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate code");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) {
              fullResponse += text;
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullResponse } : m));
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

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

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background dark">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden dark bg-background">
      {/* Top Bar */}
      <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm text-foreground truncate max-w-[200px]">{projectName}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => setShowGithubSync(true)}
          >
            <Github className="h-4 w-4" />
            Sync
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          files={fileSystem.files}
          activeFileId={fileSystem.activeFileId}
          sessions={sessions}
          onFileSelect={fileSystem.openFile}
          onToggleFolder={fileSystem.toggleFolder}
          onCreateFile={handleCreateFile}
          onDeleteFile={fileSystem.removeFile}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
        />

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={20} minSize={15}>
            <ChatPanel messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full flex flex-col bg-[hsl(var(--background))]">
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
      </div>

      <AnimatePresence>
        {fileSystem.pendingChanges.length > 0 && (
          <DiffView
            changes={fileSystem.pendingChanges}
            onApply={fileSystem.applyChanges}
            onDiscard={fileSystem.discardChanges}
          />
        )}
      </AnimatePresence>

      <CreditBlockModal open={showCreditBlock} onOpenChange={setShowCreditBlock} />

      {/* GitHub Sync Dialog */}
      <Dialog open={showGithubSync} onOpenChange={setShowGithubSync}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Sync
            </DialogTitle>
            <DialogDescription>
              Connect to GitHub to push your project code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button className="w-full gap-2">
              <Github className="h-4 w-4" />
              Connect GitHub Account
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be able to create repositories and push updates directly from the editor.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}