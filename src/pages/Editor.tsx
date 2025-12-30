import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Sparkles, Menu, Share2, Eye, FolderTree, Code2, Terminal, Zap } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { DiffView } from "@/components/DiffView";
import { UserMenu } from "@/components/UserMenu";
import { CreditBlockModal } from "@/components/CreditBlockModal";
import { GitHubIntegration } from "@/components/GitHubIntegration";
import { FileExplorerPanel } from "@/components/FileExplorerPanel";
import { CodeEditorPanel } from "@/components/CodeEditorPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { VersionHistoryPanel } from "@/components/VersionHistoryPanel";
import { ConsolePanel } from "@/components/ConsolePanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useVersionHistory } from "@/hooks/useVersionHistory";
import { useConsole } from "@/hooks/useConsole";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findFileById, FileChange, getAllFiles } from "@/lib/file-system";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getDefaultModel } from "@/lib/ai-config";
import { buildSmartContext } from "@/lib/context-manager";

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
  const console = useConsole();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreditBlock, setShowCreditBlock] = useState(false);
  const [projectName, setProjectName] = useState("Untitled");
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);
  
  // Dual AI Mode
  const [dualAIEnabled, setDualAIEnabled] = useState(true);
  
  // Panel visibility states
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);

  // Version history
  const versionHistory = useVersionHistory(fileSystem.files);

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
    setShowConsole(true);

    // Log to console
    console.info(`User request: "${content.slice(0, 50)}..."`, "Chat");

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

      // Choose endpoint based on dual AI mode
      const endpoint = dualAIEnabled 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dual-ai-generate`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      console.info(
        dualAIEnabled 
          ? "Dual AI Pipeline: GPT-5 (Architect) → Gemini 2.5 Pro (Reviewer)"
          : `Single AI Mode: ${selectedModel}`,
        "AI"
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: fullPrompt }],
          mode: dualAIEnabled ? "dual" : "architect-only",
          provider: "lovable",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`API Error: ${errorData.error}`, "AI");
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

      // Parse file changes from the final response (from reviewer in dual mode)
      const changes = parseFileChanges(fullResponse);
      
      if (changes.length > 0) {
        console.success(`Detected ${changes.length} file change(s)`, "Parser");
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
          console.log(`${existingFile ? "Modified" : "Created"}: ${change.filePath}`, "Files");
        });
      } else {
        console.warn("No file changes detected in response", "Parser");
      }

      console.success("AI generation complete", "AI");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to generate";
      console.error(errorMsg, "AI");
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Iterative Refinement Handler
  const handleRefine = useCallback((feedback: string, type: "fix" | "improve" | "custom") => {
    const lastAssistantMessage = messages.filter(m => m.role === "assistant").pop();
    
    if (!lastAssistantMessage) return;

    // Build context with the previous response
    const refinementPrompt = `
## Previous AI Response:
${lastAssistantMessage.content}

## Refinement Request (${type}):
${feedback}

## Instructions:
Based on the code you generated previously, please apply the refinement request above. 
Make sure to output the corrected/improved code in the same format:
===FILE: path/to/file.tsx===
\`\`\`tsx
// Complete file content here
\`\`\`
===END_FILE===
`;

    console.info(`Iterative refinement: ${type}`, "AI");
    handleSendMessage(refinementPrompt);
  }, [messages, handleSendMessage]);

  const handleFileSelect = (fileId: string) => {
    fileSystem.openFile(fileId);
    setShowCodeEditor(true);
  };

  const handleCreateFile = (parentId: string | null) => {
    const fileName = prompt("Enter file name:");
    if (fileName) {
      fileSystem.createFile(parentId, fileName);
      console.log(`File created: ${fileName}`, "Files");
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background dark">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const errorCount = console.logs.filter(l => l.level === "error").length;
  const warnCount = console.logs.filter(l => l.level === "warn").length;

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

        {/* Center Controls - Toggle Panels */}
        <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          <Button
            variant={showFileExplorer ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 rounded-lg text-xs gap-1.5"
            onClick={() => setShowFileExplorer(!showFileExplorer)}
          >
            <FolderTree className="h-3.5 w-3.5" />
            Files
          </Button>
          <Button
            variant={showCodeEditor ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 rounded-lg text-xs gap-1.5"
            onClick={() => setShowCodeEditor(!showCodeEditor)}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </Button>
          <Button
            variant={showConsole ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3 rounded-lg text-xs gap-1.5"
            onClick={() => setShowConsole(!showConsole)}
          >
            <Terminal className="h-3.5 w-3.5" />
            Console
            {(errorCount > 0 || warnCount > 0) && (
              <Badge 
                variant="destructive" 
                className={cn(
                  "h-4 min-w-4 px-1 text-[10px]",
                  errorCount > 0 ? "bg-red-500" : "bg-yellow-500"
                )}
              >
                {errorCount || warnCount}
              </Badge>
            )}
          </Button>
          
          {/* Dual AI Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/50">
                  <Zap className={cn("h-3.5 w-3.5", dualAIEnabled ? "text-primary" : "text-muted-foreground")} />
                  <Switch
                    checked={dualAIEnabled}
                    onCheckedChange={setDualAIEnabled}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">Dual AI</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">
                  <strong>Dual AI Pipeline:</strong><br />
                  GPT-5 generates code → Gemini 2.5 Pro reviews & improves
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          <GitHubIntegration 
            projectId={projectId || ""} 
            files={fileSystem.files} 
          />
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
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {isMobile ? (
            // Mobile: Show one panel at a time
            <div className="flex-1 min-w-0">
              {mobileView === "chat" ? (
                <ChatPanel 
                  messages={messages} 
                  onSendMessage={handleSendMessage}
                  onRefine={handleRefine}
                  isLoading={isLoading}
                  hasFileChanges={fileSystem.pendingChanges.length > 0}
                />
              ) : (
                <PreviewPanel files={fileSystem.files} code={fileSystem.activeFile?.content} projectId={projectId} />
              )}
            </div>
          ) : (
            // Desktop: Resizable panels with optional file explorer and code editor
            <div className="flex-1 flex min-w-0">
              {/* File Explorer Panel */}
              <AnimatePresence>
                {showFileExplorer && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 240, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 overflow-hidden"
                  >
                    <FileExplorerPanel
                      files={fileSystem.files}
                      activeFileId={fileSystem.activeFileId}
                      onFileSelect={handleFileSelect}
                      onToggleFolder={fileSystem.toggleFolder}
                      onCreateFile={handleCreateFile}
                      onDeleteFile={fileSystem.removeFile}
                      onClose={() => setShowFileExplorer(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Code Editor Panel */}
              <AnimatePresence>
                {showCodeEditor && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 overflow-hidden"
                  >
                    <CodeEditorPanel
                      file={fileSystem.activeFile}
                      openTabs={fileSystem.openTabs}
                      activeFileId={fileSystem.activeFileId}
                      files={fileSystem.files}
                      onTabSelect={fileSystem.openFile}
                      onTabClose={fileSystem.closeTab}
                      onContentChange={fileSystem.updateFile}
                      onClose={() => setShowCodeEditor(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
                {/* Chat Panel - Left side */}
                <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                  <ChatPanel 
                    messages={messages} 
                    onSendMessage={handleSendMessage}
                    onRefine={handleRefine}
                    isLoading={isLoading}
                    hasFileChanges={fileSystem.pendingChanges.length > 0}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />

                {/* Preview Panel - Right side (larger, main focus) */}
                <ResizablePanel defaultSize={65} minSize={40}>
                  <PreviewPanel files={fileSystem.files} code={fileSystem.activeFile?.content} projectId={projectId} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}
        </div>

        {/* Console Panel */}
        <AnimatePresence>
          {showConsole && (
            <ConsolePanel
              logs={console.logs}
              onClear={console.clear}
              onClose={() => setShowConsole(false)}
              isExpanded={consoleExpanded}
              onToggleExpand={() => setConsoleExpanded(!consoleExpanded)}
            />
          )}
        </AnimatePresence>
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
