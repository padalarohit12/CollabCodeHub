import { useState, useEffect } from 'react';
import { useBroadcastEvent, useEventListener } from '../liveblocks.config';
import { Activity, FileCode, CheckSquare, MessageSquare, UserPlus, Zap, X } from 'lucide-react';

export type ActivityEvent =
    | { type: 'file_created'; fileName: string; userName: string }
    | { type: 'file_updated'; fileName: string; userName: string }
    | { type: 'task_added'; taskTitle: string; userName: string }
    | { type: 'task_done'; taskTitle: string; userName: string }
    | { type: 'member_joined'; userName: string }
    | { type: 'message_sent'; userName: string; preview: string }
    | { type: 'ai_ran'; command: string; userName: string };

// Distribute { id, at } over every member of the union
type ActivityItem = ActivityEvent & { id: string; at: number };

const MAX_ITEMS = 50;

function eventIcon(type: ActivityEvent['type']) {
    switch (type) {
        case 'file_created': return <FileCode size={12} className="text-blue-400" />;
        case 'file_updated': return <FileCode size={12} className="text-indigo-400" />;
        case 'task_added': return <CheckSquare size={12} className="text-emerald-400" />;
        case 'task_done': return <CheckSquare size={12} className="text-green-500" />;
        case 'member_joined': return <UserPlus size={12} className="text-amber-400" />;
        case 'message_sent': return <MessageSquare size={12} className="text-slate-400" />;
        case 'ai_ran': return <Zap size={12} className="text-violet-400" />;
    }
}

function eventText(event: ActivityEvent): string {
    switch (event.type) {
        case 'file_created': return `${event.userName} created ${event.fileName}`;
        case 'file_updated': return `${event.userName} edited ${event.fileName}`;
        case 'task_added': return `${event.userName} added task: ${event.taskTitle}`;
        case 'task_done': return `${event.userName} completed: ${event.taskTitle}`;
        case 'member_joined': return `${event.userName} joined the workspace`;
        case 'message_sent': return `${event.userName}: ${event.preview}`;
        case 'ai_ran': return `${event.userName} ran AI agent: "${event.command}"`;
    }
}

function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

// ─── Hook: broadcast an activity event ────────────────────────────────────────
export function useActivityBroadcast() {
    return useBroadcastEvent();
}

// ─── ActivityFeed Component ────────────────────────────────────────────────────
export function ActivityFeed({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [items, setItems] = useState<ActivityItem[]>([]);

    useEventListener(({ event }) => {
        const e = event as unknown as ActivityEvent;
        if (!e?.type || (e.type as string) === 'CHAT_MESSAGE') return;
        const item = { ...e, id: Math.random().toString(36).slice(2), at: Date.now() } as ActivityItem;
        setItems(prev => [item, ...prev].slice(0, MAX_ITEMS));
    });

    // Re-render timestamps every minute
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 60_000);
        return () => clearInterval(t);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-80 z-[95] flex flex-col bg-[#0a0a0c] border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-indigo-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Live Activity</h3>
                    {items.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-[10px] font-bold text-indigo-400">{items.length}</span>
                    )}
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                        <Activity size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">No activity yet</p>
                        <p className="text-[10px] text-center px-6">Events appear here as your team creates files, adds tasks, and sends messages.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/60">
                        {items.map(item => (
                            <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] group transition-colors">
                                <div className="h-6 w-6 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-slate-700 transition-colors">
                                    {eventIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                                        {eventText(item)}
                                    </p>
                                    <p className="text-[10px] text-slate-600 mt-0.5 font-medium">{timeAgo(item.at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {items.length > 0 && (
                <div className="p-3 border-t border-slate-800">
                    <button
                        onClick={() => setItems([])}
                        className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                    >
                        Clear feed
                    </button>
                </div>
            )}
        </div>
    );
}
