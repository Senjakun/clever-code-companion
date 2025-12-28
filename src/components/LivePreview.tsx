import { useMemo } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackThemeProvider,
} from "@codesandbox/sandpack-react";
import { Monitor, Loader2 } from "lucide-react";

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  // Parse the code and create sandpack files
  const files = useMemo(() => {
    if (!code.trim()) return null;

    // Check if the code is a complete component or just JSX
    const hasImports = code.includes("import ");
    const hasExport = code.includes("export ");

    let componentCode = code;

    // If code doesn't have imports, wrap it properly
    if (!hasImports) {
      componentCode = `import React from 'react';\n\n${code}`;
    }

    // If code doesn't have default export, try to add one
    if (!hasExport) {
      // Check if it's a function component
      const functionMatch = code.match(/function\s+(\w+)/);
      const constMatch = code.match(/const\s+(\w+)\s*=/);
      const componentName = functionMatch?.[1] || constMatch?.[1];
      
      if (componentName) {
        componentCode = `${componentCode}\n\nexport default ${componentName};`;
      } else {
        // Wrap the code as App component
        componentCode = `import React from 'react';\n\nexport default function App() {\n  return (\n    ${code}\n  );\n}`;
      }
    }

    return {
      "/App.tsx": componentCode,
      "/index.tsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      "/styles.css": `@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #0a0a0a;
  color: #fafafa;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}`,
    };
  }, [code]);

  if (!files) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background rounded-xl border border-border">
        <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          <Monitor className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Live Preview</h2>
        <p className="text-muted-foreground max-w-sm">
          Generate code to see a live preview here. The preview updates automatically as code is generated.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border overflow-hidden bg-[#1e1e1e]">
      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={files}
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
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
          <div className="h-full relative">
            <SandpackPreview
              showNavigator={false}
              showRefreshButton={false}
              showOpenInCodeSandbox={false}
              style={{ height: "100%" }}
            />
          </div>
        </SandpackThemeProvider>
      </SandpackProvider>
    </div>
  );
}
