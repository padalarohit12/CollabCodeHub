import { useState, useEffect, useRef } from 'react';
import { Search, Command, Layout, MessageSquare, CheckSquare, Zap, Hash, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface CommandItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    description: string;
    action: () => void;
    category: 'Navigation' | 'Actions' | 'Rooms';
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const commands: CommandItem[] = [
        { id: 'go-editor', icon: <Layout size={16} />, label: 'Switch to Editor', description: 'Open the Monaco collaborative editor', action: () => { onClose(); }, category: 'Navigation' },
        { id: 'go-chat', icon: <MessageSquare size={16} />, label: 'Open Live Chat', description: 'Message your team members', action: () => { onClose(); }, category: 'Navigation' },
        { id: 'go-tasks', icon: <CheckSquare size={16} />, label: 'Task Board', description: 'Manage project tickets', action: () => { onClose(); }, category: 'Navigation' },
        { id: 'ai-fix', icon: <Zap size={16} />, label: 'Optimize with AI', description: 'Run Pulse performance analysis', action: () => { onClose(); }, category: 'Actions' },
        { id: 'new-room', icon: <Hash size={16} />, label: 'Join Room...', description: 'Switch to a different workspace', action: () => { navigate('/'); onClose(); }, category: 'Rooms' },
    ];

    const filtered = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(search.toLowerCase()) ||
        cmd.description.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % filtered.length);
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                filtered[selectedIndex]?.action();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filtered, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            <div className="w-full max-w-xl apple-glass-heavy rounded-2xl shadow-[0_48px_96px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden pointer-events-auto transition-apple scale-100 opacity-100">
                <div className="flex items-center px-4 h-14 border-b border-white/5 bg-white/[0.02]">
                    <Search size={20} className="text-white/30 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20"
                    />
                    <div className="flex items-center gap-1.5 px-2 py-1 apple-glass rounded-lg border-white/10">
                        <Command size={10} className="text-white/40" />
                        <span className="text-[10px] font-bold text-white/40">K</span>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                    {filtered.length > 0 ? (
                        <div className="space-y-1">
                            {['Navigation', 'Actions', 'Rooms'].map((cat) => {
                                const catItems = filtered.filter(f => f.category === cat);
                                if (catItems.length === 0) return null;
                                return (
                                    <div key={cat} className="space-y-1">
                                        <h4 className="px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-widest text-white/20">{cat}</h4>
                                        {catItems.map((cmd) => {
                                            const globalIndex = filtered.indexOf(cmd);
                                            const isSelected = globalIndex === selectedIndex;
                                            return (
                                                <div
                                                    key={cmd.id}
                                                    onClick={cmd.action}
                                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                    className={cn(
                                                        "flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-apple",
                                                        isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-white/60 hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg flex items-center justify-center border",
                                                            isSelected ? "bg-white/20 border-white/20" : "bg-white/5 border-white/5"
                                                        )}>
                                                            {cmd.icon}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold">{cmd.label}</p>
                                                            <p className={cn("text-[10px]", isSelected ? "text-white/60" : "text-white/30")}>
                                                                {cmd.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isSelected && <ArrowRight size={14} className="text-white/40" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-sm text-white/20 italic font-medium">No commands found for "{search}"</p>
                        </div>
                    )}
                </div>

                <div className="px-4 h-10 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white/20">↑↓ Navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white/20">↵ Select</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-white/10 uppercase tracking-tighter">CollabCode v1.0</span>
                </div>
            </div>
        </div>
    );
}
