import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, Terminal, Brain, Zap, FileCode, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import { useWorkspaceContext } from '../hooks/useWorkspaceContext';
import { useSelf, useBroadcastEvent } from '../liveblocks.config';

export function AIPulse({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: "I'm your AI Engineer — I can see your entire workspace. Ask me to refactor code, generate components, explain bugs, or optimize performance." }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [showWorkspace, setShowWorkspace] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const workspaceContext = useWorkspaceContext();
    const self = useSelf();
    const broadcastActivity = useBroadcastEvent();

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        broadcastActivity({
            type: 'ai_ran',
            command: userMsg.length > 40 ? userMsg.slice(0, 40) + '...' : userMsg,
            userName: self?.info?.name || 'User'
        });

        try {
            const apiKey = import.meta.env.VITE_HF_TOKEN;

            if (!apiKey) {
                await new Promise(r => setTimeout(r, 600));
                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: `⚠️ No HuggingFace token configured.\n\nAdd VITE_HF_TOKEN=your_token to your .env file and restart the server.\n\nGet a free token at https://huggingface.co/settings/tokens`
                }]);
                return;
            }

            const systemPrompt = workspaceContext
                ? `You are an expert software engineer AI assistant embedded in CollabCodeHub, a real-time collaborative coding platform.\n\nThe user's current workspace contains ${workspaceContext.fileCount} file(s) with ${workspaceContext.totalLines} total lines:\n\n${workspaceContext.contextString}\n\nAnswer strictly based on the code above. Be concise. Use markdown formatting.`
                : `You are an expert software engineer AI assistant embedded in CollabCodeHub. The workspace has no files yet. Help the user get started.`;

            const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'Qwen/Qwen2.5-7B-Instruct:together',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages.slice(-6).map(m => ({
                            role: m.role === 'ai' ? 'assistant' : 'user',
                            content: m.content
                        })),
                        { role: 'user', content: userMsg }
                    ],
                    max_tokens: 1024,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err?.error?.message || 'HuggingFace API error');
            }

            const data = await response.json();
            const aiText = data.choices?.[0]?.message?.content || 'No response from model.';
            setMessages(prev => [...prev, { role: 'ai', content: aiText }]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `⚠️ Error: ${err.message || 'Failed to reach HuggingFace API.'}`
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-[480px] z-[100] flex flex-col apple-glass-heavy border-l border-white/10 shadow-2xl animate-apple-fade-in">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Brain size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/90">AI Pulse</h3>
                        <p className="text-[10px] font-bold text-white/30 truncate">
                            {workspaceContext
                                ? `${workspaceContext.fileCount} files · ${workspaceContext.totalLines} lines · Qwen2.5-7B`
                                : import.meta.env.VITE_HF_TOKEN ? 'No files · Qwen2.5-7B' : '⚠ No HF token configured'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowWorkspace(!showWorkspace)}
                        className={cn(
                            "p-2 rounded-xl transition-apple",
                            showWorkspace ? "bg-indigo-600 text-white" : "text-white/40 hover:bg-white/5 hover:text-white"
                        )}
                        title="Toggle Workspace View"
                    >
                        <Layers size={18} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-apple text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Workspace Context Panel */}
            {showWorkspace && workspaceContext && (
                <div className="border-b border-white/5 bg-black/20 p-4 max-h-48 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Workspace Files</p>
                    <div className="space-y-2">
                        {workspaceContext.fileTree.map((file: any) => (
                            <div key={file.id} className="flex items-center gap-2 px-3 py-2 apple-glass rounded-xl border-white/5">
                                <FileCode size={14} className="text-indigo-400" />
                                <span className="text-xs font-semibold text-white/70 flex-1">{file.name}</span>
                                <span className="text-[10px] font-bold text-white/20">{file.lines}L</span>
                            </div>
                        ))}
                        {workspaceContext.fileCount === 0 && (
                            <p className="text-xs text-white/30 italic">No files created yet.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/20">
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10",
                            msg.role === 'ai' ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-white/60"
                        )}>
                            {msg.role === 'ai' ? <Brain size={14} /> : <Terminal size={14} />}
                        </div>
                        <div className={cn(
                            "flex-1 px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                            msg.role === 'ai'
                                ? "bg-white/5 text-white/90 rounded-tl-none border border-white/5"
                                : "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/20"
                        )}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-4 items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse border border-indigo-500/10">
                            <Zap size={14} />
                        </div>
                        <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/20 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:0.2s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white/[0.03] border-t border-white/5">
                <div className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your code, request refactors, or generate components..."
                        className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-apple placeholder:text-white/20 text-white"
                        disabled={isTyping}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                        <Sparkles size={20} />
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-apple disabled:opacity-20 disabled:grayscale"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="mt-3 px-2 flex items-center justify-between">
                    <div className="flex gap-3">
                        <span
                            onClick={() => setInput("Refactor my code for better performance")}
                            className="text-[10px] font-bold text-white/20 hover:text-white/40 cursor-pointer transition-apple flex items-center gap-1"
                        >
                            <Zap size={10} /> Optimize
                        </span>
                        <span
                            onClick={() => setInput("Create a new React component")}
                            className="text-[10px] font-bold text-white/20 hover:text-white/40 cursor-pointer transition-apple flex items-center gap-1"
                        >
                            <FileCode size={10} /> Generate Component
                        </span>
                        <span
                            onClick={() => setInput("Find bugs in my code")}
                            className="text-[10px] font-bold text-white/20 hover:text-white/40 cursor-pointer transition-apple flex items-center gap-1"
                        >
                            <Terminal size={10} /> Debug
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-white/10 italic">Qwen2.5-7B · HuggingFace</span>
                </div>
            </form>
        </div>
    );
}
