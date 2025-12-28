import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  FileCode,
  FileJson,
  FileType,
} from "lucide-react";
import { FileNode } from "@/lib/file-system";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileExplorerProps {
  files: FileNode[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentId: string | null) => void;
  onDeleteFile: (fileId: string) => void;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case "json":
      return <FileJson className="h-4 w-4 text-yellow-400" />;
    case "css":
      return <FileType className="h-4 w-4 text-purple-400" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
};

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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded-md transition-all duration-150 group",
              isActive
                ? "bg-primary/20 text-primary"
                : "hover:bg-muted/50 text-foreground/80"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (isFolder) {
                onToggleFolder(node.id);
              } else {
                onFileSelect(node.id);
              }
            }}
          >
            {isFolder ? (
              <>
                {node.isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {node.isOpen ? (
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-400" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="text-sm truncate flex-1">{node.name}</span>
          </div>

          <AnimatePresence>
            {isFolder && node.isOpen && node.children && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
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
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isFolder && (
          <ContextMenuItem onClick={() => onCreateFile(node.id)}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            New File
          </ContextMenuItem>
        )}
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDeleteFile(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
  onToggleFolder,
  onCreateFile,
  onDeleteFile,
}: FileExplorerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onCreateFile(null)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-2 scrollbar-thin">
        {files.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            depth={0}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onToggleFolder={onToggleFolder}
            onCreateFile={onCreateFile}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </div>
    </div>
  );
}
