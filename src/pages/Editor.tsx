import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Sparkles, Menu, Share2, Settings, Code2, Eye } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DiffView } from "@/components/DiffView";
import { UserMenu } from "@/components/UserMenu";
import { CreditBlockModal } from "@/components/CreditBlockModal";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findFileById, FileChange, getAllFiles } from "@/lib/file-system";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreditBlock, setShowCreditBlock] = useState(false);
  const [projectName, setProjectName] = useState("Untitled");
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");

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

  const buildFileContext = () => {
    const allFiles = getAllFiles(fileSystem.files);
    const fileList = allFiles.map(f => `- ${f.id}`).join("\n");
    const fileContents = allFiles
      .map(f => `### ${f.id}\n\`\`\`${f.language || "text"}\n${f.content}\n\`\`\``)
      .join("\n\n");
    
    return `## Current Project Files:\n${fileList}\n\n## File Contents:\n${fileContents}`;
  };

  const handleSendMessage = async (content: string) => {
    if (credits <= 0) {
      setShowCreditBlock(true);
      return;
    }

    const userMessage: Message = { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Switch to preview on mobile when sending message
    if (isMobile) {
      setMobileView("preview");
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

    let fullResponse = "";

    try {
      const fileContext = buildFileContext();
      const fullPrompt = `${fileContext}\n\n## User Request:\n${content}`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: fullPrompt }],
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
      {/* Top Bar - Lovable Style */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-xl hover:bg-muted" 
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">{projectName}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">QuinYukie AI</span>
            </div>
          </div>
        </div>

        {/* Mobile View Toggle */}
        {isMobile && (
          <div className="flex items-center bg-muted/50 rounded-xl p-1">
            <Button
              variant={mobileView === "chat" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              onClick={() => setMobileView("chat")}
            >
              <Menu className="h-3.5 w-3.5 mr-1.5" />
              Chat
            </Button>
            <Button
              variant={mobileView === "preview" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-lg text-xs"
              onClick={() => setMobileView("preview")}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-xl hidden sm:flex border-border/50"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <UserMenu />
        </div>
      </header>

      {/* Main Content - Lovable Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {isMobile ? (
          // Mobile: Show one panel at a time
          <div className="flex-1 min-w-0">
            {mobileView === "chat" ? (
              <ChatPanel 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading} 
              />
            ) : (
              <PreviewPanel files={fileSystem.files} code={fileSystem.activeFile?.content} />
            )}
          </div>
        ) : (
          // Desktop: Resizable panels - Chat left, Preview right (like Lovable)
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
            {/* Chat Panel - Left side */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <ChatPanel 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading} 
              />
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />

            {/* Preview Panel - Right side (larger, main focus) */}
            <ResizablePanel defaultSize={65} minSize={40}>
              <PreviewPanel files={fileSystem.files} code={fileSystem.activeFile?.content} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Diff View for pending changes */}
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
    </div>
  );
}