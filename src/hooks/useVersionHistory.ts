// Version History Hook for Undo/Redo functionality

import { useState, useCallback } from "react";
import { FileNode } from "@/lib/file-system";

export interface VersionSnapshot {
  id: string;
  timestamp: Date;
  files: FileNode[];
  description: string;
  messageId?: string;
}

const MAX_HISTORY_SIZE = 50;

export function useVersionHistory(initialFiles: FileNode[]) {
  const [history, setHistory] = useState<VersionSnapshot[]>([
    {
      id: "initial",
      timestamp: new Date(),
      files: JSON.parse(JSON.stringify(initialFiles)),
      description: "Initial state",
    },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const saveSnapshot = useCallback(
    (files: FileNode[], description: string, messageId?: string) => {
      const newSnapshot: VersionSnapshot = {
        id: Date.now().toString(),
        timestamp: new Date(),
        files: JSON.parse(JSON.stringify(files)),
        description,
        messageId,
      };

      setHistory((prev) => {
        // Remove any future history if we're not at the end
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push(newSnapshot);

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
          return newHistory;
        }

        return newHistory;
      });

      setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    },
    [currentIndex]
  );

  const undo = useCallback((): FileNode[] | null => {
    if (!canUndo) return null;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return JSON.parse(JSON.stringify(history[newIndex].files));
  }, [canUndo, currentIndex, history]);

  const redo = useCallback((): FileNode[] | null => {
    if (!canRedo) return null;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return JSON.parse(JSON.stringify(history[newIndex].files));
  }, [canRedo, currentIndex, history]);

  const getCurrentSnapshot = useCallback((): VersionSnapshot | null => {
    return history[currentIndex] || null;
  }, [history, currentIndex]);

  const getHistory = useCallback((): VersionSnapshot[] => {
    return history;
  }, [history]);

  const goToSnapshot = useCallback(
    (snapshotId: string): FileNode[] | null => {
      const index = history.findIndex((s) => s.id === snapshotId);
      if (index === -1) return null;

      setCurrentIndex(index);
      return JSON.parse(JSON.stringify(history[index].files));
    },
    [history]
  );

  const clearHistory = useCallback((currentFiles: FileNode[]) => {
    setHistory([
      {
        id: "initial",
        timestamp: new Date(),
        files: JSON.parse(JSON.stringify(currentFiles)),
        description: "Initial state",
      },
    ]);
    setCurrentIndex(0);
  }, []);

  return {
    canUndo,
    canRedo,
    currentIndex,
    historyLength: history.length,
    saveSnapshot,
    undo,
    redo,
    getCurrentSnapshot,
    getHistory,
    goToSnapshot,
    clearHistory,
  };
}
