import { useState } from "react";
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Code2, Eye, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/CodeEditor";
import { cn } from "@/lib/utils";

type ViewMode = "preview" | "code";
type DeviceMode = "desktop" | "tablet" | "mobile";

interface PreviewPanelProps {
  previewUrl?: string;
  code?: string;
}

export function PreviewPanel({ previewUrl, code }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("code");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: "w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  };

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--preview-bg))] border-l border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-1">
          {/* Device Toggles */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5 mr-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md",
                deviceMode === "desktop" && "bg-background shadow-sm"
              )}
              onClick={() => setDeviceMode("desktop")}
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md",
                deviceMode === "tablet" && "bg-background shadow-sm"
              )}
              onClick={() => setDeviceMode("tablet")}
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md",
                deviceMode === "mobile" && "bg-background shadow-sm"
              )}
              onClick={() => setDeviceMode("mobile")}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div
          className={cn(
            "mx-auto h-full transition-all duration-300",
            deviceWidths[deviceMode]
          )}
        >
          {viewMode === "preview" ? (
            <div className="h-full rounded-xl border border-border bg-background overflow-hidden shadow-2xl">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                    <Monitor className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Live Preview</h2>
                  <p className="text-muted-foreground max-w-sm">
                    Live preview coming soon. View the generated code in the Code tab.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <CodeEditor code={code || ""} />
          )}
        </div>
      </div>
    </div>
  );
}
