import { useState, useCallback } from "react";
import { Monitor, Tablet, Smartphone, RefreshCw, Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/CodeEditor";
import { LivePreview } from "@/components/LivePreview";
import { FileNode } from "@/lib/file-system";
import { cn } from "@/lib/utils";

type ViewMode = "preview" | "code";
type DeviceMode = "desktop" | "tablet" | "mobile";

interface PreviewPanelProps {
  files: FileNode[];
  code?: string;
}

export function PreviewPanel({ files, code }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: "w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--preview-bg))] border-l border-border">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="h-8 bg-secondary">
            <TabsTrigger value="preview" className="h-6 px-3 text-xs gap-1.5">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="h-6 px-3 text-xs gap-1.5">
              <Code2 className="h-3 w-3" />
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <div className="flex items-center bg-secondary rounded-lg p-0.5 mr-2">
            {[
              { mode: "desktop" as DeviceMode, icon: Monitor },
              { mode: "tablet" as DeviceMode, icon: Tablet },
              { mode: "mobile" as DeviceMode, icon: Smartphone },
            ].map(({ mode, icon: Icon }) => (
              <Button
                key={mode}
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md", deviceMode === mode && "bg-background shadow-sm")}
                onClick={() => setDeviceMode(mode)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className={cn("mx-auto h-full transition-all duration-300", deviceWidths[deviceMode])}>
          {viewMode === "preview" ? (
            <LivePreview key={refreshKey} files={files} />
          ) : (
            <CodeEditor code={code || ""} />
          )}
        </div>
      </div>
    </div>
  );
}
