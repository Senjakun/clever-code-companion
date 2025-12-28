import { useState, useCallback } from "react";
import {
  FileNode,
  FileChange,
  createDefaultProject,
  findFileById,
  updateFileContent,
  addFile,
  deleteFile,
  toggleFolder,
  getLanguageFromFileName,
} from "@/lib/file-system";

export function useFileSystem() {
  const [files, setFiles] = useState<FileNode[]>(createDefaultProject());
  const [activeFileId, setActiveFileId] = useState<string | null>("src/App.tsx");
  const [openTabs, setOpenTabs] = useState<string[]>(["src/App.tsx"]);
  const [pendingChanges, setPendingChanges] = useState<FileChange[]>([]);

  const activeFile = activeFileId ? findFileById(files, activeFileId) : null;

  const openFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setOpenTabs((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
  }, []);

  const closeTab = useCallback((fileId: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((id) => id !== fileId);
      if (activeFileId === fileId && newTabs.length > 0) {
        setActiveFileId(newTabs[newTabs.length - 1]);
      } else if (newTabs.length === 0) {
        setActiveFileId(null);
      }
      return newTabs;
    });
  }, [activeFileId]);

  const updateFile = useCallback((fileId: string, content: string) => {
    setFiles((prev) => updateFileContent(prev, fileId, content));
  }, []);

  const createFile = useCallback((parentId: string | null, name: string, content: string = "") => {
    const newFile: FileNode = {
      id: parentId ? `${parentId}/${name}` : name,
      name,
      type: "file",
      content,
      language: getLanguageFromFileName(name),
    };
    setFiles((prev) => addFile(prev, parentId, newFile));
    openFile(newFile.id);
    return newFile;
  }, [openFile]);

  const createFolder = useCallback((parentId: string | null, name: string) => {
    const newFolder: FileNode = {
      id: parentId ? `${parentId}/${name}` : name,
      name,
      type: "folder",
      children: [],
      isOpen: true,
    };
    setFiles((prev) => addFile(prev, parentId, newFolder));
    return newFolder;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => deleteFile(prev, fileId));
    closeTab(fileId);
  }, [closeTab]);

  const toggle = useCallback((folderId: string) => {
    setFiles((prev) => toggleFolder(prev, folderId));
  }, []);

  const addPendingChange = useCallback((change: FileChange) => {
    setPendingChanges((prev) => {
      const existing = prev.findIndex((c) => c.fileId === change.fileId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = change;
        return updated;
      }
      return [...prev, change];
    });
  }, []);

  const applyChanges = useCallback(() => {
    pendingChanges.forEach((change) => {
      if (change.type === "create") {
        const parts = change.fileId.split("/");
        const fileName = parts.pop()!;
        const parentId = parts.length > 0 ? parts.join("/") : null;
        createFile(parentId, fileName, change.newContent);
      } else if (change.type === "modify") {
        updateFile(change.fileId, change.newContent);
      } else if (change.type === "delete") {
        removeFile(change.fileId);
      }
    });
    setPendingChanges([]);
  }, [pendingChanges, createFile, updateFile, removeFile]);

  const discardChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  return {
    files,
    activeFile,
    activeFileId,
    openTabs,
    pendingChanges,
    openFile,
    closeTab,
    updateFile,
    createFile,
    createFolder,
    removeFile,
    toggleFolder: toggle,
    addPendingChange,
    applyChanges,
    discardChanges,
    setFiles,
  };
}
