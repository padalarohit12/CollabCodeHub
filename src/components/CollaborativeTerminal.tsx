import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { X, Terminal as TerminalIcon, Maximize2, Minimize2, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { CodeRunner } from './CodeRunner';
// ...

interface TerminalTab {
    id: string;
    name: string;
    terminal: Terminal;
    fitAddon: FitAddon;
}

export function CollaborativeTerminal({ roomId }: { roomId: string }) {
    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeView, setActiveView] = useState<'terminal' | 'runner'>('terminal');
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const currentTabRef = useRef<string | null>(null);

    // Initial connection
    useEffect(() => {
        if (!roomId) return;

        // Connect to WebSocket
        // In dev, usually port 3001
        const wsUrl = `ws://localhost:3001?roomId=${roomId}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to terminal backend');
            if (tabs.length === 0) {
                createNewTab(ws);
            }
        };

        ws.onmessage = (event) => {
            const data = event.data;
            // Broadcast to the active tab or all tabs? 
            // For MVP single-shell model, usually it broadcasts to the terminal associated with the room.
            // If we have multiple tabs in UI but one shell, write to all/active?
            // Let's write to active tab if it exists, or find the "main" tab.
            // Simplified: Write to all tabs since they mirror the same room shell.
            tabs.forEach(t => t.terminal.write(data));
        };

        return () => {
            ws.close();
        };
    }, [roomId, tabs]); // Re-bind if tabs change? No, better keep logic simple.

    const createNewTab = (ws: WebSocket | null = wsRef.current) => {
        const id = Math.random().toString(36).substring(7);
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#6366f1',
                cursorAccent: '#000000',
                black: '#000000',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#f3f4f6',
                brightBlack: '#6b7280',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#ffffff'
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        terminal.onData((data) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        const newTab: TerminalTab = {
            id,
            name: `Terminal`, // Single shared terminal for now
            terminal,
            fitAddon
        };

        setTabs(prev => {
            // For MVP, we only allow one shared terminal to avoid confusion
            if (prev.length > 0) return prev;
            return [newTab];
        });

        setActiveTabId(id);
        currentTabRef.current = id;

        // Mount terminal after state update
        setTimeout(() => {
            const container = document.getElementById(`terminal-${id}`);
            if (container) {
                terminal.open(container);
                fitAddon.fit();
                terminal.focus();
            }
        }, 100);
    };

    const closeTab = (id: string) => {
        const tab = tabs.find(t => t.id === id);
        if (tab) {
            tab.terminal.dispose();
        }

        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        if (activeTabId === id && newTabs.length > 0) {
            setActiveTabId(newTabs[0].id);
        } else if (newTabs.length === 0) {
            setActiveTabId(null);
        }
    };

    // Auto-fit on resize
    useEffect(() => {
        const handleResize = () => {
            tabs.forEach(tab => {
                if (tab.id === activeTabId) {
                    setTimeout(() => tab.fitAddon.fit(), 0);
                }
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [tabs, activeTabId]);

    // Re-fit when opening/maximizing
    useEffect(() => {
        if (activeTabId) {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab) setTimeout(() => tab.fitAddon.fit(), 100);
        }
    }, [isMaximized, activeTabId]);

    return (
        <div className={cn(
            "flex flex-col bg-black border-t border-white/5 transition-all text-white",
            isMaximized ? "fixed bottom-0 left-0 right-0 z-50 h-[80vh] border-t-2 border-indigo-500/50" : "h-80"
        )}>
            {/* Terminal Header */}
            <div className="h-10 flex items-center justify-between px-4 bg-white/[0.05] border-b border-white/5">
                <div className="flex items-center gap-1 flex-1 overflow-x-auto custom-scrollbar">
                    {/* View switcher */}
                    <button
                        onClick={() => setActiveView('terminal')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            activeView === 'terminal'
                                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                                : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        )}
                    >
                        <TerminalIcon size={12} />
                        Terminal
                    </button>
                    <button
                        onClick={() => setActiveView('runner')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            activeView === 'runner'
                                ? "bg-green-600/30 text-green-300 border border-green-500/30"
                                : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        )}
                    >
                        <Play size={12} />
                        Run Code
                    </button>

                    {/* Terminal tabs (only shown in terminal view) */}
                    {activeView === 'terminal' && tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={cn(
                                "group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-apple text-xs font-semibold select-none",
                                activeTabId === tab.id
                                    ? "bg-white/10 text-white/80"
                                    : "text-white/30 hover:text-white/50 hover:bg-white/5"
                            )}
                        >
                            <span>{tab.name}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-apple"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    {activeView === 'terminal' && tabs.length === 0 && (
                        <span className="text-white/30 text-xs pl-2">Connecting...</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-mono">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        ONLINE
                    </div>
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-apple"
                        title={isMaximized ? "Minimize" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeView === 'runner' ? (
                <div className="flex-1 overflow-hidden">
                    <CodeRunner />
                </div>
            ) : (
                <div ref={terminalContainerRef} className="flex-1 relative overflow-hidden bg-black/90">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            id={`terminal-${tab.id}`}
                            className={cn(
                                "absolute inset-0 p-2",
                                activeTabId === tab.id ? "block" : "hidden"
                            )}
                        />
                    ))}
                    {tabs.length === 0 && (
                        <div className="flex items-center justify-center h-full text-white/40 text-sm">
                            <div className="flex flex-col items-center gap-2 animate-pulse">
                                <TerminalIcon size={32} className="opacity-50" />
                                <span>Connecting to backend...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
