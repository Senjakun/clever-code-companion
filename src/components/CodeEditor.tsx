import { useState, useEffect, useRef } from "react";
import { Copy, Check, Download, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  code: string;
  language?: string;
  fileName?: string;
}

export function CodeEditor({ code, language = "tsx", fileName = "Component.tsx" }: CodeEditorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "File downloaded" });
  };

  // Simple syntax highlighting
  const highlightCode = (code: string) => {
    return code
      .replace(/(\/\/.*$)/gm, '<span class="text-emerald-400">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-emerald-400">$1</span>')
      .replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|new|this|async|await|try|catch|throw|default)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-orange-400">$1</span>')
      .replace(/(\d+)/g, '<span class="text-cyan-400">$1</span>')
      .replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="text-yellow-300">$1$2$1</span>')
      .replace(/(&lt;\/?)(\w+)/g, '$1<span class="text-red-400">$2</span>')
      .replace(/\b(React|useState|useEffect|useRef|useMemo|useCallback)\b/g, '<span class="text-blue-400">$1</span>');
  };

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#1e1e1e] rounded-xl border border-border">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <FileCode className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Code Generated</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Send a prompt to generate code. The AI will create React components with TypeScript and Tailwind CSS.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border bg-[#1e1e1e] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27ca40]" />
          </div>
          <span className="text-xs text-[#808080] ml-2">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#808080] hover:text-white hover:bg-[#3c3c3c]"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#808080] hover:text-white hover:bg-[#3c3c3c]"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Code Content */}
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="relative">
          {/* Line Numbers */}
          <div className="absolute left-0 top-0 p-4 pr-2 text-right select-none text-[#6e7681] text-sm font-mono border-r border-[#3c3c3c] bg-[#1e1e1e]">
            {code.split("\n").map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
          
          {/* Code */}
          <pre
            ref={codeRef}
            className="p-4 pl-16 text-sm font-mono text-[#d4d4d4] leading-6 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
