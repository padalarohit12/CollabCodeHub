import { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Bot,
    Cpu,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

export function DashboardAI() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsAnalyzing(true);
        setResult(null);

        // Simulate SaaS-level portfolio analysis
        setTimeout(() => {
            setIsAnalyzing(false);
            setResult(`Based on your recent activity, "Shared Space" is your most active room with 12 collaborators. You have 3 pending tasks in "Project Phoenix" and the AI suggests refactoring the auth module in "room_a1b2c3".`);
        }, 1500);
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6">
            <div className={cn(
                "apple-glass-heavy rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.4)] transition-apple overflow-hidden",
                isOpen ? "h-auto" : "h-14"
            )}>
                {!isOpen ? (
                    <div
                        onClick={() => setIsOpen(true)}
                        className="h-14 flex items-center px-6 cursor-text group"
                    >
                        <Sparkles size={18} className="text-indigo-400 mr-4 animate-pulse" />
                        <span className="text-sm font-medium text-white/30 group-hover:text-white/50 transition-apple italic">
                            Query Workspace Intelligence... (Cmd + J)
                        </span>
                        <div className="ml-auto flex items-center gap-1.5 px-2 py-1 apple-glass rounded-lg border-white/10 opacity-40">
                            <span className="text-[10px] font-bold text-white">⌘J</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-2">
                        <form onSubmit={handleSearch} className="flex items-center px-4 h-14">
                            <Bot size={20} className="text-indigo-400 mr-4" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Analyze my portfolio... e.g., 'Which room needs attention?'"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20"
                            />
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); setQuery(''); setResult(null); }}
                                className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-apple"
                            >
                                Close
                            </button>
                        </form>

                        {isAnalyzing && (
                            <div className="px-8 pb-8 pt-2 flex flex-col items-center gap-4 animate-apple-fade-in">
                                <div className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Scanning Portfolio Data</p>
                            </div>
                        )}

                        {result && !isAnalyzing && (
                            <div className="px-6 pb-6 pt-2 animate-apple-fade-in">
                                <div className="apple-glass rounded-3xl p-6 border-white/10 bg-indigo-500/5">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="h-10 w-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                            <Cpu size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Intelligence Report</p>
                                            <p className="text-xs text-white/80 leading-relaxed font-medium">{result}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <QuickAction icon={<Zap size={12} />} label="Optimize Rooms" />
                                        <QuickAction icon={<ShieldCheck size={12} />} label="Security Audit" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickAction({ icon, label }: { icon: any, label: string }) {
    return (
        <button className="flex items-center gap-2 px-3 py-2 apple-glass rounded-xl border-white/5 text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/5 transition-apple">
            {icon}
            {label}
        </button>
    );
}
