import { Clock, RotateCcw, RotateCw, History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VersionSnapshot } from "@/hooks/useVersionHistory";
import { cn } from "@/lib/utils";

interface VersionHistoryPanelProps {
  canUndo: boolean;
  canRedo: boolean;
  history: VersionSnapshot[];
  currentIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  onGoToSnapshot: (snapshotId: string) => void;
}

export function VersionHistoryPanel({
  canUndo,
  canRedo,
  history,
  currentIndex,
  onUndo,
  onRedo,
  onGoToSnapshot,
}: VersionHistoryPanelProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>

        {/* History Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
              <History className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">History</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <ScrollArea className="h-64">
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  Version History ({history.length} snapshots)
                </p>
                {history
                  .slice()
                  .reverse()
                  .map((snapshot, idx) => {
                    const actualIndex = history.length - 1 - idx;
                    const isCurrent = actualIndex === currentIndex;

                    return (
                      <DropdownMenuItem
                        key={snapshot.id}
                        className={cn(
                          "flex items-start gap-2 p-2 cursor-pointer",
                          isCurrent && "bg-primary/10"
                        )}
                        onClick={() => onGoToSnapshot(snapshot.id)}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 mt-1.5 rounded-full shrink-0",
                            isCurrent ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{snapshot.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(snapshot.timestamp)}</span>
                            {isCurrent && (
                              <span className="text-primary font-medium">Current</span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
