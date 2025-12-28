import { useMemo } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackThemeProvider,
} from "@codesandbox/sandpack-react";
import { Monitor } from "lucide-react";
import { FileNode, getAllFiles } from "@/lib/file-system";

interface LivePreviewProps {
  files: FileNode[];
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

    // Ensure we have required files
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

    if (!fileMap["/src/styles.css"]) {
      fileMap["/src/styles.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`;
    }

    return fileMap;
  }, [files]);

  if (!sandpackFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background rounded-lg border border-border">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Monitor className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Live Preview</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your app will render here as you build
        </p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-border overflow-hidden">
      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
            "framer-motion": "latest",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
          },
        }}
        options={{
          externalResources: [
            "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
          ],
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
      >
        <SandpackThemeProvider theme="dark">
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{ height: "100%" }}
          />
        </SandpackThemeProvider>
      </SandpackProvider>
    </div>
  );
}
