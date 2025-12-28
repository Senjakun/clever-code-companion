import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorTabsProps {
  tabs: string[];
  activeTab: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function EditorTabs({ tabs, activeTab, onSelectTab, onCloseTab }: EditorTabsProps) {
  if (tabs.length === 0) return null;

  const getFileName = (path: string) => {
    return path.split("/").pop() || path;
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => (
        <motion.div
          key={tab}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors text-xs",
            activeTab === tab
              ? "bg-[#1e1e1e] text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-[#2d2d2d]"
          )}
          onClick={() => onSelectTab(tab)}
        >
          <span className="truncate max-w-[100px]">{getFileName(tab)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
