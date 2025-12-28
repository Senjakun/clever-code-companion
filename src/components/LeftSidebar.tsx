import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderTree, MessageSquare } from "lucide-react";
import { FileExplorer } from "@/components/FileExplorer";
import { ChatHistory } from "@/components/ChatHistory";
import { FileNode } from "@/lib/file-system";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TabType = "files" | "chat";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  isActive?: boolean;
}

interface LeftSidebarProps {
  files: FileNode[];
  activeFileId: string | null;
  sessions: ChatSession[];
  onFileSelect: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null) => void;
  onDeleteFile: (fileId: string) => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export function LeftSidebar({
  files,
  activeFileId,
  sessions,
  onFileSelect,
  onToggleFolder,
  onCreateFile,
  onDeleteFile,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("files");

  const tabs = [
    { id: "files" as TabType, icon: FolderTree, label: "Files" },
    { id: "chat" as TabType, icon: MessageSquare, label: "Chat" },
  ];

  return (
    <div className="flex h-full bg-sidebar border-r border-sidebar-border">
      {/* Icon Bar */}
      <div className="w-12 flex flex-col items-center py-2 border-r border-sidebar-border bg-sidebar/50">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 mb-1 transition-all",
              activeTab === tab.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-5 w-5" />
          </Button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="w-56 flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === "files" ? (
            <motion.div
              key="files"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden"
            >
              <FileExplorer
                files={files}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onToggleFolder={onToggleFolder}
                onCreateFile={onCreateFile}
                onDeleteFile={onDeleteFile}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden"
            >
              <ChatHistory
                sessions={sessions}
                onNewChat={onNewChat}
                onSelectChat={onSelectChat}
                onDeleteChat={onDeleteChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}