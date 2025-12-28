import { useRef, useEffect } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

interface MonacoEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function MonacoEditor({
  value,
  language = "typescript",
  onChange,
  readOnly = false,
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure TypeScript/JavaScript
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
    });

    // Add React types
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `declare module 'react' {
        export function useState<T>(initial: T): [T, (value: T) => void];
        export function useEffect(effect: () => void, deps?: any[]): void;
        export function useRef<T>(initial: T): { current: T };
        export function useMemo<T>(factory: () => T, deps: any[]): T;
        export function useCallback<T>(callback: T, deps: any[]): T;
        export const Fragment: any;
        export type FC<P = {}> = (props: P) => JSX.Element;
        export type ReactNode = any;
      }`,
      "react.d.ts"
    );

    // Set editor options
    editor.updateOptions({
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 16, bottom: 16 },
      lineNumbers: "on",
      renderLineHighlight: "all",
      bracketPairColorization: { enabled: true },
      automaticLayout: true,
    });
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-[#1e1e1e]">
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(val) => onChange?.(val || "")}
        onMount={handleEditorMount}
        loading={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
        options={{
          readOnly,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
