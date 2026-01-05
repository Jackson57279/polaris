"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

import { useWebContainer } from "../context";

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { container, isBooting, error, setCurrentProcess } = useWebContainer();

  const initTerminal = useCallback(async () => {
    if (!terminalRef.current || !container) return;

    if (xtermRef.current) {
      xtermRef.current.dispose();
    }

    const term = new XTerm({
      theme: {
        background: "#1e1e2e",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
        cursorAccent: "#1e1e2e",
        black: "#45475a",
        red: "#f38ba8",
        green: "#a6e3a1",
        yellow: "#f9e2af",
        blue: "#89b4fa",
        magenta: "#f5c2e7",
        cyan: "#94e2d5",
        white: "#bac2de",
        brightBlack: "#585b70",
        brightRed: "#f38ba8",
        brightGreen: "#a6e3a1",
        brightYellow: "#f9e2af",
        brightBlue: "#89b4fa",
        brightMagenta: "#f5c2e7",
        brightCyan: "#94e2d5",
        brightWhite: "#a6adc8",
      },
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln("Welcome to Polaris Terminal");
    term.writeln("Starting shell...\n");

    try {
      const shellProcess = await container.spawn("jsh", {
        terminal: {
          cols: term.cols,
          rows: term.rows,
        },
      });

      setCurrentProcess(shellProcess);

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            term.write(data);
          },
        })
      );

      const input = shellProcess.input.getWriter();
      term.onData((data) => {
        input.write(data);
      });

      shellProcess.exit.then(() => {
        setCurrentProcess(null);
        term.writeln("\n\r[Process exited]");
      });
    } catch (err) {
      term.writeln(`\r\nFailed to start shell: ${err}`);
    }
  }, [container, setCurrentProcess]);

  useEffect(() => {
    if (container && !isBooting) {
      initTerminal();
    }
  }, [container, isBooting, initTerminal]);

  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      xtermRef.current?.dispose();
    };
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-background ${className}`}>
        <div className="text-center text-destructive">
          <p className="font-medium">Failed to initialize WebContainer</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isBooting) {
    return (
      <div className={`flex items-center justify-center h-full bg-background ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Initializing container...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={terminalRef}
      className={`h-full w-full bg-[#1e1e2e] ${className}`}
    />
  );
}
