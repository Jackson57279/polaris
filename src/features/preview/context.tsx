"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { getWebContainer, teardownWebContainer } from "@/lib/webcontainer";

interface WebContainerContextValue {
  container: WebContainer | null;
  isBooting: boolean;
  error: Error | null;
  serverUrl: string | null;
  currentProcess: WebContainerProcess | null;
  setCurrentProcess: (process: WebContainerProcess | null) => void;
}

const WebContainerContext = createContext<WebContainerContextValue | null>(null);

interface WebContainerProviderProps {
  children: React.ReactNode;
}

export function WebContainerProvider({ children }: WebContainerProviderProps) {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [currentProcess, setCurrentProcess] = useState<WebContainerProcess | null>(null);

  useEffect(() => {
    let mounted = true;

    getWebContainer()
      .then((wc) => {
        if (!mounted) return;
        setContainer(wc);
        setIsBooting(false);

        wc.on("server-ready", (_port, url) => {
          setServerUrl(url);
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsBooting(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      teardownWebContainer();
    };
  }, []);

  return (
    <WebContainerContext.Provider
      value={{
        container,
        isBooting,
        error,
        serverUrl,
        currentProcess,
        setCurrentProcess,
      }}
    >
      {children}
    </WebContainerContext.Provider>
  );
}

export function useWebContainer() {
  const ctx = useContext(WebContainerContext);
  if (!ctx) {
    throw new Error("useWebContainer must be used within WebContainerProvider");
  }
  return ctx;
}

export function useWebContainerOptional() {
  return useContext(WebContainerContext);
}
