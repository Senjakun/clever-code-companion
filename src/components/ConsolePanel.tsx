import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Terminal, 
  X, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type LogLevel = "log" | "info" | "warn" | "error" | "success";

export interface ConsoleLog {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  source?: string;
  details?: string;
}

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear: () => void;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const levelConfig = {
  log: {
    icon: Terminal,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    badge: "bg-muted text-muted-foreground",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    badge: "bg-blue-500/20 text-blue-400",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    badge: "bg-yellow-500/20 text-yellow-400",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    badge: "bg-red-500/20 text-red-400",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10",
    badge: "bg-green-500/20 text-green-400",
  },
};

export function ConsolePanel({ 
  logs, 
  onClear, 
  onClose, 
  isExpanded = false,
  onToggleExpand 
}: ConsolePanelProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === "all" 
    ? logs 
    : logs.filter(log => log.level === filter);

  const logCounts = {
    all: logs.length,
    log: logs.filter(l => l.level === "log").length,
    info: logs.filter(l => l.level === "info").length,
    warn: logs.filter(l => l.level === "warn").length,
    error: logs.filter(l => l.level === "error").length,
    success: logs.filter(l => l.level === "success").length,
  };

  const copyLog = (log: ConsoleLog) => {
    const text = `[${log.level.toUpperCase()}] ${log.timestamp.toLocaleTimeString()} - ${log.message}${log.details ? `\n${log.details}` : ""}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const formatTime = (date: Date) => {
    const time = date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = date.getMilliseconds().toString().padStart(3, "0");
    return `${time}.${ms}`;
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: isExpanded ? 300 : 200, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t border-border bg-card/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="h-10 border-b border-border/50 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Console</span>
          <Badge variant="secondary" className="h-5 text-xs">
            {logs.length}
          </Badge>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {(["all", "error", "warn", "info", "log"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                filter === level
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
              {logCounts[level] > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({logCounts[level]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClear}
            title="Clear console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleExpand}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Close console"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Log List */}
      <ScrollArea 
        ref={scrollRef}
        className="flex-1"
        onScroll={(e) => {
          const target = e.target as HTMLElement;
          const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
          setAutoScroll(isAtBottom);
        }}
      >
        <div className="p-2 space-y-0.5 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <span>No logs to display</span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const config = levelConfig[log.level];
              const Icon = config.icon;

              return (
                <div
                  key={log.id}
                  className={cn(
                    "group flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors",
                    config.bg
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.color)} />
                  
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatTime(log.timestamp)}
                  </span>

                  {log.source && (
                    <Badge variant="outline" className="h-4 text-[10px] shrink-0">
                      {log.source}
                    </Badge>
                  )}

                  <span className={cn("flex-1 break-all", config.color)}>
                    {log.message}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => copyLog(log)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
