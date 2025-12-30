import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonacoEditor } from "@/components/MonacoEditor";
import { FileNode } from "@/lib/file-system";
import { cn } from "@/lib/utils";

interface CodeEditorPanelProps {
  file: FileNode | null;
  openTabs: string[];
  activeFileId: string | null;
  files: FileNode[];
  onTabSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  onContentChange: (fileId: string, content: string) => void;
  onClose: () => void;
}

function getFileName(fileId: string): string {
  return fileId.split("/").pop() || fileId;
}

export function CodeEditorPanel({
  file,
  openTabs,
  activeFileId,
  files,
  onTabSelect,
  onTabClose,
  onContentChange,
  onClose,
}: CodeEditorPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-r border-border/50">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border/50 bg-muted/30">
        <div className="flex-1 flex items-center overflow-x-auto">
          {openTabs.map((tabId) => (
            <div
              key={tabId}
              className={cn(
                "flex items-center gap-2 px-3 py-2 border-r border-border/30 cursor-pointer transition-colors min-w-0",
                activeFileId === tabId
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => onTabSelect(tabId)}
            >
              <span className="text-xs truncate max-w-[120px]">
                {getFileName(tabId)}
              </span>
              <button
                className="h-4 w-4 rounded-sm hover:bg-muted flex items-center justify-center shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tabId);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 m-1 shrink-0"
          onClick={onClose}
          title="Close editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {file ? (
          <MonacoEditor
            value={file.content || ""}
            language={file.language || "typescript"}
            onChange={(value) => onContentChange(file.id, value || "")}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a file to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
