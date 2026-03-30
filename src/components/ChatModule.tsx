import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2, Bot, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useOthers, useUpdateMyPresence, useMutation, useSelf, useBroadcastEvent } from '../liveblocks.config';
import { LiveObject } from '@liveblocks/client';
import { runAIAgent } from '../lib/aiAgent';
import { useWorkspaceContext } from '../hooks/useWorkspaceContext';

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    is_ai?: boolean;
    profiles?: {
        full_name: string;
        avatar_url: string;
    } | null;
}

const AI_TRIGGER_PREFIXES = ['/ai ', '@ai ', '/agent '];

export function ChatModule({ roomId }: { roomId: string }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [agentThinking, setAgentThinking] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Typing Indicators
    const others = useOthers();
    const self = useSelf();
    const broadcastActivity = useBroadcastEvent();
    const updatePresence = useUpdateMyPresence();
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Workspace context for AI
    const workspaceContext = useWorkspaceContext();

    // Liveblocks mutation to write files into the workspace
    const applyFileToWorkspace = useMutation(({ storage }, name: string, content: string) => {
        const filesMap = storage.get('files');
        // Check if file already exists by name
        let existingId: string | null = null;
        filesMap.forEach((file, id) => {
            if (file.get('name') === name) existingId = id;
        });

        if (existingId) {
            filesMap.get(existingId)?.set('content', content);
        } else {
            const id = Math.random().toString(36).substring(7);
            filesMap.set(id, new LiveObject({ name, content, type: 'file' }));
        }
    }, []);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*, profiles(full_name, avatar_url)')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) console.error('Error fetching messages:', error);
            else setMessages((data as Message[]) || []);
            setLoading(false);
            scrollToBottom();
        };

        fetchMessages();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`room-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `room_id=eq.${roomId}`
                },
                async (payload) => {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const messageWithProfile: Message = {
                        id: payload.new.id,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                        user_id: payload.new.user_id,
                        profiles: profile
                    };

                    setMessages(current => [...current, messageWithProfile]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    useEffect(scrollToBottom, [messages, agentThinking]);

    const isAICommand = (text: string) =>
        AI_TRIGGER_PREFIXES.some(p => text.toLowerCase().startsWith(p));

    const extractAICommand = (text: string) => {
        for (const prefix of AI_TRIGGER_PREFIXES) {
            if (text.toLowerCase().startsWith(prefix)) {
                return text.slice(prefix.length).trim();
            }
        }
        return text;
    };

    const handleAgentCommand = async (rawMessage: string) => {
        const command = extractAICommand(rawMessage);
        const apiKey = import.meta.env.VITE_HF_TOKEN;

        // Add "thinking" indicator to local state
        setAgentThinking(true);

        // Post user's /ai message to chat (visible to all)
        await supabase.from('messages').insert({
            content: rawMessage,
            room_id: roomId,
            user_id: user!.id
        });

        try {
            const result = await runAIAgent(command, workspaceContext, apiKey);

            // Apply file operations to Liveblocks workspace
            let filesApplied = 0;
            for (const op of result.files) {
                if ((op.action === 'create' || op.action === 'update') && op.content) {
                    applyFileToWorkspace(op.name, op.content);
                    filesApplied++;
                }
            }

            // Build AI reply
            const filesSummary = filesApplied > 0
                ? `\n\n📁 Applied to workspace: ${result.files.map(f => `\`${f.name}\``).join(', ')}`
                : '';

            // Post AI reply to chat as the user (with a special prefix so we can style it)
            await supabase.from('messages').insert({
                content: `🤖 **AI Agent:** ${result.message}${filesSummary}`,
                room_id: roomId,
                user_id: user!.id
            });
        } catch (err: any) {
            await supabase.from('messages').insert({
                content: `🤖 **AI Agent Error:** ${err.message || 'Failed to process command'}`,
                room_id: roomId,
                user_id: user!.id
            });
        } finally {
            setAgentThinking(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const content = newMessage.trim();
        setNewMessage('');
        // Clear presence typing state on send
        updatePresence({ isTyping: false, typingText: '', typingName: '' } as any);

        // Check if it's an AI agent command
        if (isAICommand(content)) {
            await handleAgentCommand(content);
            return;
        }

        // Regular chat message
        const { error } = await supabase
            .from('messages')
            .insert({ content, room_id: roomId, user_id: user.id });

        if (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } else {
            broadcastActivity({
                type: 'message_sent',
                userName: self?.info?.name || 'User',
                preview: content.length > 30 ? content.slice(0, 30) + '...' : content
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewMessage(val);
        // Broadcast full text + real name to all collaborators
        updatePresence({
            isTyping: val.length > 0,
            typingText: val,
            typingName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone'
        } as any);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (val.length > 0) {
            typingTimeoutRef.current = setTimeout(() => {
                updatePresence({ isTyping: false, typingText: '', typingName: '' } as any);
            }, 4000);
        }
    };

    const isAIMessage = (content: string) => content.startsWith('🤖 **AI Agent');

    // Live typing previews from all collaborators
    const liveTypers = others
        .filter(o => (o.presence as any).isTyping && (o.presence as any).typingText)
        .map(o => ({
            id: o.id,
            name: (o.presence as any).typingName || 'Someone',
            text: (o.presence as any).typingText as string
        }));

    const isAITrigger = AI_TRIGGER_PREFIXES.some(p => newMessage.toLowerCase().startsWith(p));

    return (
        <div className="flex flex-col h-full min-h-0 bg-[#0c0c0e]">
            {/* Header */}
            <div className="flex h-12 items-center justify-between px-6 border-b border-slate-800 bg-[#0f0f12]">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Live Chat</h3>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <Bot size={12} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-400">Qwen2.5 Agent Active</span>
                </div>
            </div>

            {/* AI Hint Banner */}
            <div className="px-6 py-2 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center gap-2">
                <Sparkles size={12} className="text-indigo-400/60 flex-shrink-0" />
                <p className="text-[10px] text-indigo-400/60 font-medium">
                    Type <code className="bg-indigo-500/10 px-1 py-0.5 rounded text-indigo-300">/ai</code> or <code className="bg-indigo-500/10 px-1 py-0.5 rounded text-indigo-300">@ai</code> followed by any instruction to have the AI write code directly into your workspace.
                </p>
            </div>

            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 custom-scrollbar">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    messages.map((msg) => {
                        const aiMsg = isAIMessage(msg.content);
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3 group",
                                    msg.user_id === user?.id && !aiMsg ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <div className="h-8 w-8 flex-shrink-0">
                                    {aiMsg ? (
                                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                    ) : (
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`}
                                            alt="Avatar"
                                            className="h-full w-full rounded-xl bg-slate-800 object-cover border border-slate-700"
                                        />
                                    )}
                                </div>
                                <div className={cn(
                                    "flex flex-col max-w-[75%]",
                                    msg.user_id === user?.id && !aiMsg ? "items-end" : "items-start"
                                )}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">
                                            {aiMsg ? 'AI Agent · Qwen2.5' : (msg.profiles?.full_name || msg.user_id.substring(0, 6))}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-bold">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                                        aiMsg
                                            ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-slate-100 rounded-tl-none border border-indigo-500/20"
                                            : msg.user_id === user?.id
                                                ? "bg-indigo-600 text-white rounded-tr-none"
                                                : "bg-slate-800/50 text-slate-200 rounded-tl-none border border-slate-700/50"
                                    )}>
                                        {aiMsg
                                            ? msg.content.replace('🤖 **AI Agent:** ', '').replace('🤖 **AI Agent Error:** ', '⚠️ ')
                                            : msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* AI Thinking Indicator */}
                {agentThinking && (
                    <div className="flex gap-3 items-center animate-in fade-in slide-in-from-bottom-2">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse">
                            <Bot size={14} className="text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                            <Loader2 size={14} className="animate-spin text-indigo-400" />
                            <span className="text-xs text-indigo-300 font-medium">Agent thinking & writing code...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 pt-0">
                {/* Live Typing Previews */}
                {liveTypers.length > 0 && (
                    <div className="mb-2 space-y-1.5">
                        {liveTypers.map((typer) => (
                            <div key={typer.id} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${typer.id}`}
                                    alt={typer.name}
                                    className="h-5 w-5 rounded-full border border-slate-600 mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mr-2">{typer.name}</span>
                                    <span className="text-xs text-slate-300 truncate">
                                        {typer.text.length > 60 ? typer.text.slice(0, 60) + '…' : typer.text}
                                    </span>
                                </div>
                                <span className="flex gap-0.5 items-center mt-1 flex-shrink-0">
                                    <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce" />
                                    <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]" />
                                    <span className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.3s]" />
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="relative group">
                    <textarea
                        value={newMessage}
                        onChange={(e) => {
                            handleInputChange(e as any);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                        placeholder={isAITrigger ? "Describe what you want the AI to build..." : "Type a message... (or /ai to invoke the agent)"}
                        rows={1}
                        className={cn(
                            "w-full border rounded-2xl pl-6 pr-14 py-4 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600 resize-none custom-scrollbar min-h-[56px] max-h-32",
                            isAITrigger
                                ? "bg-indigo-500/5 border-indigo-500/40 focus:ring-indigo-500/20 focus:border-indigo-500/60 text-white"
                                : "bg-[#0f0f12] border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-white"
                        )}
                        disabled={agentThinking}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || agentThinking}
                        className={cn(
                            "absolute right-3 bottom-3 h-10 w-10 flex items-center justify-center rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale",
                            isAITrigger
                                ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30"
                                : "bg-indigo-600 text-white shadow-indigo-500/20"
                        )}
                    >
                        {isAITrigger ? <Bot size={18} /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}
