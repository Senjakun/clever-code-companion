import { Plus, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  isActive?: boolean;
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export function ChatHistory({
  sessions,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatHistoryProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          History
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onNewChat}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-2">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 scrollbar-thin">
        <div className="space-y-1 pb-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-all duration-150",
                session.isActive
                  ? "bg-primary/20 text-primary"
                  : "text-foreground/70 hover:bg-muted/50"
              )}
              onClick={() => onSelectChat(session.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {formatDate(session.timestamp)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-28">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(session.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
