import { useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { Monitor, Terminal, AlertCircle, CheckCircle2 } from "lucide-react";
import { FileNode, getAllFiles } from "@/lib/file-system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  files: FileNode[];
}

// Status indicator component
function SandpackStatus() {
  const { sandpack } = useSandpack();
  const { status, error } = sandpack;

  if (error) {
    return (
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/90 text-destructive-foreground text-xs">
        <AlertCircle className="h-3 w-3" />
        <span>Error</span>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/90 text-white text-xs">
        <CheckCircle2 className="h-3 w-3" />
        <span>Running</span>
      </div>
    );
  }

  return null;
}

// Inner preview component with console toggle
function PreviewContent() {
  const [showConsole, setShowConsole] = useState(false);

  return (
    <div className="h-full flex flex-col relative">
      <SandpackStatus />
      
      {/* Preview Area */}
      <div className={cn(
        "flex-1 transition-all duration-200",
        showConsole ? "h-[60%]" : "h-full"
      )}>
        <SandpackPreview
          showNavigator={false}
          showRefreshButton={false}
          showOpenInCodeSandbox={false}
          style={{ height: "100%" }}
        />
      </div>

      {/* Console Area */}
      {showConsole && (
        <div className="h-[40%] border-t border-border bg-card">
          <SandpackConsole
            style={{ height: "100%" }}
            showHeader={false}
          />
        </div>
      )}

      {/* Console Toggle */}
      <div className="absolute bottom-2 right-2 z-10">
        <Button
          variant={showConsole ? "default" : "secondary"}
          size="sm"
          className="h-7 text-xs gap-1.5 rounded-lg shadow-lg"
          onClick={() => setShowConsole(!showConsole)}
        >
          <Terminal className="h-3 w-3" />
          Console
        </Button>
      </div>
    </div>
  );
}

export function LivePreview({ files }: LivePreviewProps) {
  const sandpackFiles = useMemo(() => {
    const allFiles = getAllFiles(files);
    
    if (allFiles.length === 0) return null;

    const fileMap: Record<string, string> = {};
    
    allFiles.forEach((file) => {
      // Convert file paths to sandpack format
      let path = file.id;
      if (!path.startsWith("/")) path = "/" + path;
      fileMap[path] = file.content || "";
    });

    // Ensure we have required entry files
    if (!fileMap["/src/index.tsx"]) {
      fileMap["/src/index.tsx"] = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    }

    if (!fileMap["/src/App.tsx"]) {
      fileMap["/src/App.tsx"] = `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to QuinYukie AI
        </h1>
        <p className="text-gray-400">
          Start building by sending a prompt
        </p>
      </div>
    </div>
  );
}`;
    }

    if (!fileMap["/src/styles.css"]) {
      fileMap["/src/styles.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
    }

    return fileMap;
  }, [files]);

  if (!sandpackFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 border border-primary/20">
          <Monitor className="h-10 w-10 text-primary/60" />
        </div>
        <h2 className="text-xl font-semibold mb-3 text-foreground">Live Preview</h2>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
          Your app will render here in real-time as you build. Send a prompt to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-white">
      <SandpackProvider
        template="react-ts"
        theme={{
          colors: {
            surface1: "#1a1a1a",
            surface2: "#252525",
            surface3: "#2f2f2f",
            clickable: "#999999",
            base: "#808080",
            disabled: "#4d4d4d",
            hover: "#c5c5c5",
            accent: "#8b5cf6",
            error: "#ef4444",
            errorSurface: "#fef2f2",
          },
          syntax: {
            plain: "#f8f8f2",
            comment: { color: "#6272a4", fontStyle: "italic" },
            keyword: "#ff79c6",
            tag: "#f1fa8c",
            punctuation: "#f8f8f2",
            definition: "#50fa7b",
            property: "#66d9ef",
            static: "#bd93f9",
            string: "#f1fa8c",
          },
          font: {
            body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            mono: '"Fira Code", "JetBrains Mono", Monaco, Consolas, monospace',
            size: "14px",
            lineHeight: "1.6",
          },
        }}
        files={sandpackFiles}
        customSetup={{
          entry: "/src/index.tsx",
          dependencies: {
            "lucide-react": "latest",
            "framer-motion": "latest",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "clsx": "latest",
            "tailwind-merge": "latest",
          },
        }}
        options={{
          externalResources: [
            "https://cdn.tailwindcss.com",
          ],
          recompileMode: "delayed",
          recompileDelay: 300,
          autorun: true,
          autoReload: true,
        }}
      >
        <PreviewContent />
      </SandpackProvider>
    </div>
  );
}
