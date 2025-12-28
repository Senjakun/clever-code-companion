export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
  language?: string;
  isOpen?: boolean;
}

export interface FileChange {
  fileId: string;
  fileName: string;
  oldContent: string;
  newContent: string;
  type: "create" | "modify" | "delete";
}

export const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    html: "html",
    json: "json",
    md: "markdown",
    py: "python",
  };
  return langMap[ext || ""] || "plaintext";
};

export const createDefaultProject = (): FileNode[] => {
  return [
    {
      id: "src",
      name: "src",
      type: "folder",
      isOpen: true,
      children: [
        {
          id: "src/App.tsx",
          name: "App.tsx",
          type: "file",
          language: "typescript",
          content: `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Quine AI
        </h1>
        <p className="text-gray-400">
          Start building by sending a prompt
        </p>
      </div>
    </div>
  );
}`,
        },
        {
          id: "src/index.tsx",
          name: "index.tsx",
          type: "file",
          language: "typescript",
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        {
          id: "src/styles.css",
          name: "styles.css",
          type: "file",
          language: "css",
          content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`,
        },
      ],
    },
    {
      id: "package.json",
      name: "package.json",
      type: "file",
      language: "json",
      content: `{
  "name": "quine-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
    },
  ];
};

export const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFileById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const updateFileContent = (
  nodes: FileNode[],
  fileId: string,
  newContent: string
): FileNode[] => {
  return nodes.map((node) => {
    if (node.id === fileId) {
      return { ...node, content: newContent };
    }
    if (node.children) {
      return { ...node, children: updateFileContent(node.children, fileId, newContent) };
    }
    return node;
  });
};

export const addFile = (
  nodes: FileNode[],
  parentId: string | null,
  newFile: FileNode
): FileNode[] => {
  if (!parentId) {
    return [...nodes, newFile];
  }
  return nodes.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      return { ...node, children: [...(node.children || []), newFile], isOpen: true };
    }
    if (node.children) {
      return { ...node, children: addFile(node.children, parentId, newFile) };
    }
    return node;
  });
};

export const deleteFile = (nodes: FileNode[], fileId: string): FileNode[] => {
  return nodes
    .filter((node) => node.id !== fileId)
    .map((node) => {
      if (node.children) {
        return { ...node, children: deleteFile(node.children, fileId) };
      }
      return node;
    });
};

export const toggleFolder = (nodes: FileNode[], folderId: string): FileNode[] => {
  return nodes.map((node) => {
    if (node.id === folderId && node.type === "folder") {
      return { ...node, isOpen: !node.isOpen };
    }
    if (node.children) {
      return { ...node, children: toggleFolder(node.children, folderId) };
    }
    return node;
  });
};

export const getAllFiles = (nodes: FileNode[]): FileNode[] => {
  const files: FileNode[] = [];
  const traverse = (nodeList: FileNode[]) => {
    for (const node of nodeList) {
      if (node.type === "file") files.push(node);
      if (node.children) traverse(node.children);
    }
  };
  traverse(nodes);
  return files;
};
