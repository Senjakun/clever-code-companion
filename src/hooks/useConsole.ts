import { useState, useCallback } from "react";
import { ConsoleLog, LogLevel } from "@/components/ConsolePanel";

export function useConsole() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);

  const addLog = useCallback((
    level: LogLevel, 
    message: string, 
    source?: string, 
    details?: string
  ) => {
    const newLog: ConsoleLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      level,
      message,
      timestamp: new Date(),
      source,
      details,
    };

    setLogs(prev => [...prev, newLog]);
    return newLog.id;
  }, []);

  const log = useCallback((message: string, source?: string) => {
    return addLog("log", message, source);
  }, [addLog]);

  const info = useCallback((message: string, source?: string) => {
    return addLog("info", message, source);
  }, [addLog]);

  const warn = useCallback((message: string, source?: string, details?: string) => {
    return addLog("warn", message, source, details);
  }, [addLog]);

  const error = useCallback((message: string, source?: string, details?: string) => {
    return addLog("error", message, source, details);
  }, [addLog]);

  const success = useCallback((message: string, source?: string) => {
    return addLog("success", message, source);
  }, [addLog]);

  const clear = useCallback(() => {
    setLogs([]);
  }, []);

  const removeLog = useCallback((id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
  }, []);

  return {
    logs,
    log,
    info,
    warn,
    error,
    success,
    clear,
    removeLog,
    addLog,
  };
}
