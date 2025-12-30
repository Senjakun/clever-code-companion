import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { FileNode } from "@/lib/file-system";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileExplorerPanelProps {
  files: FileNode[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null) => void;
  onDeleteFile: (fileId: string) => void;
  onClose: () => void;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case "jsx":
    case "js":
      return <FileCode className="h-4 w-4 text-yellow-400" />;
    case "json":
      return <FileJson className="h-4 w-4 text-orange-400" />;
    case "css":
    case "scss":
      return <FileCode className="h-4 w-4 text-pink-400" />;
    case "html":
      return <FileCode className="h-4 w-4 text-red-400" />;
    case "md":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null) => void;
  onDeleteFile: (fileId: string) => void;
}

function FileTreeItem({
  node,
  depth,
  activeFileId,
  onFileSelect,
  onToggleFolder,
  onCreateFile,
  onDeleteFile,
}: FileTreeItemProps) {
  const isFolder = node.type === "folder";
  const isActive = node.id === activeFileId;
  const isOpen = node.isOpen;

  const handleClick = () => {
    if (isFolder) {
      onToggleFolder(node.id);
    } else {
      onFileSelect(node.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded-md transition-colors text-sm",
              isActive
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleClick}
          >
            {isFolder ? (
              <>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                {isOpen ? (
                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 text-primary shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>

          <AnimatePresence>
            {isFolder && isOpen && node.children && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {node.children.map((child) => (
                  <FileTreeItem
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    activeFileId={activeFileId}
                    onFileSelect={onFileSelect}
                    onToggleFolder={onToggleFolder}
                    onCreateFile={onCreateFile}
                    onDeleteFile={onDeleteFile}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isFolder && (
          <ContextMenuItem onClick={() => onCreateFile(node.id)}>
            <Plus className="h-4 w-4 mr-2" />
            New File
          </ContextMenuItem>
        )}
        <ContextMenuItem 
          onClick={() => onDeleteFile(node.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileExplorerPanel({
  files,
  activeFileId,
  onFileSelect,
  onToggleFolder,
  onCreateFile,
  onDeleteFile,
  onClose,
}: FileExplorerPanelProps) {
  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Files</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCreateFile(null)}
            title="New file"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.map((file) => (
            <FileTreeItem
              key={file.id}
              node={file}
              depth={0}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onToggleFolder={onToggleFolder}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
