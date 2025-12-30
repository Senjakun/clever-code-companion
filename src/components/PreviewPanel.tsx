import { useState, useCallback } from "react";
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Expand, Shrink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LivePreview } from "@/components/LivePreview";
import { FileNode } from "@/lib/file-system";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type DeviceMode = "desktop" | "tablet" | "mobile";

interface PreviewPanelProps {
  files: FileNode[];
  code?: string;
  projectId?: string;
}

export function PreviewPanel({ files, code, projectId }: PreviewPanelProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: "w-full",
    tablet: "max-w-[768px]",
    mobile: "max-w-[375px]",
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const previewUrl = projectId ? `${window.location.origin}/preview/${projectId}` : null;

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const handleCopyUrl = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      toast({
        title: "URL Copied",
        description: "Preview URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn(
      "flex h-full flex-col bg-gradient-to-br from-muted/30 to-muted/10",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Preview Header - Lovable Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          
          {/* URL Bar */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 min-w-[200px] max-w-[400px]">
            <div className="h-3 w-3 rounded-full bg-green-500/50" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {previewUrl || "localhost:3000"}
            </span>
            {previewUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={handleCopyUrl}
                title="Copy URL"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Device Mode Toggle */}
          <div className="flex items-center bg-secondary/50 rounded-xl p-1 mr-2">
            {[
              { mode: "desktop" as DeviceMode, icon: Monitor, label: "Desktop" },
              { mode: "tablet" as DeviceMode, icon: Tablet, label: "Tablet" },
              { mode: "mobile" as DeviceMode, icon: Smartphone, label: "Mobile" },
            ].map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant="ghost"
                size="icon"
                title={label}
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  deviceMode === mode 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setDeviceMode(mode)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" 
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hidden sm:flex"
            onClick={handleOpenInNewTab}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4 overflow-hidden flex items-start justify-center">
        <div className={cn(
          "h-full w-full transition-all duration-300 rounded-xl overflow-hidden shadow-2xl shadow-black/10 border border-border/30 bg-background",
          deviceWidths[deviceMode],
          deviceMode !== "desktop" && "mx-auto"
        )}>
          <LivePreview key={refreshKey} files={files} />
        </div>
      </div>
    </div>
  );
}