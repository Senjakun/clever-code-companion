import { useMemo } from "react";
import { motion } from "framer-motion";
import { diffLines, Change } from "diff";
import { Check, X, FileCode, Plus, Minus, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileChange } from "@/lib/file-system";
import { cn } from "@/lib/utils";

interface DiffViewProps {
  changes: FileChange[];
  onApply: () => void;
  onDiscard: () => void;
}

function DiffBlock({ change }: { change: FileChange }) {
  const diff = useMemo(() => {
    return diffLines(change.oldContent, change.newContent);
  }, [change.oldContent, change.newContent]);

  const getTypeIcon = () => {
    switch (change.type) {
      case "create":
        return <Plus className="h-3.5 w-3.5 text-green-400" />;
      case "delete":
        return <Minus className="h-3.5 w-3.5 text-red-400" />;
      default:
        return <Edit3 className="h-3.5 w-3.5 text-amber-400" />;
    }
  };

  const getTypeBadge = () => {
    switch (change.type) {
      case "create":
        return "bg-green-500/20 text-green-400";
      case "delete":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-amber-500/20 text-amber-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
        <FileCode className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{change.fileName}</span>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
            getTypeBadge()
          )}
        >
          {getTypeIcon()}
          {change.type}
        </span>
      </div>
      <div className="font-mono text-xs overflow-x-auto">
        {diff.map((part, index) => (
          <div
            key={index}
            className={cn(
              "px-3 py-0.5 border-l-2",
              part.added && "bg-green-500/10 border-l-green-500 text-green-300",
              part.removed && "bg-red-500/10 border-l-red-500 text-red-300",
              !part.added && !part.removed && "border-l-transparent text-muted-foreground"
            )}
          >
            {part.value.split("\n").map((line, lineIndex) => (
              <div key={lineIndex} className="flex">
                <span className="select-none w-5 text-right mr-3 opacity-50">
                  {part.added ? "+" : part.removed ? "-" : " "}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function DiffView({ changes, onApply, onDiscard }: DiffViewProps) {
  if (changes.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-4xl max-h-[80vh] bg-card rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-lg font-semibold">Review Changes</h2>
            <p className="text-sm text-muted-foreground">
              {changes.length} file{changes.length !== 1 ? "s" : ""} modified
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDiscard}>
              <X className="h-4 w-4 mr-1.5" />
              Discard
            </Button>
            <Button size="sm" onClick={onApply} className="glow-primary">
              <Check className="h-4 w-4 mr-1.5" />
              Apply Changes
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {changes.map((change) => (
              <DiffBlock key={change.fileId} change={change} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
