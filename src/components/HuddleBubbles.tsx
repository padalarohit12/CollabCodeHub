import { useState, useEffect, useRef } from 'react';
import { useOthers, useSelf, useUpdateMyPresence } from '../liveblocks.config';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function HuddleBubbles({ roomId }: { roomId: string }) {
    const { user } = useAuth();
    const others = useOthers();
    const self = useSelf();
    const updateMyPresence = useUpdateMyPresence();
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [notesSummary, setNotesSummary] = useState<string | null>(null);


    const [isInHuddle, setIsInHuddle] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const joinHuddle = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            streamRef.current = stream;
            setIsInHuddle(true);
            updateMyPresence({ isInHuddle: true } as any);
        } catch (err) {
            console.error('Failed to access media devices:', err);
        }
    };

    const leaveHuddle = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsInHuddle(false);
        updateMyPresence({ isInHuddle: false } as any);

        // Generate AI meeting notes automatically
        generateMeetingNotes();
    };

    const generateMeetingNotes = async () => {
        const apiKey = import.meta.env.VITE_HF_TOKEN;
        if (!apiKey || !user) return;

        setIsGeneratingNotes(true);
        try {
            // Fetch recent chat messages (last 50)
            const { data: messages } = await supabase
                .from('messages')
                .select('content, profiles(full_name)')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!messages || messages.length < 3) {
                setIsGeneratingNotes(false);
                return;
            }

            const chatText = messages
                .reverse()
                .map((m: any) => `${m.profiles?.full_name || 'User'}: ${m.content}`)
                .join('\n');

            const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'Qwen/Qwen2.5-7B-Instruct:together',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a meeting notes AI. Analyze the chat and output a JSON object:
{
  "summary": "1-2 sentence summary of what was discussed",
  "action_items": ["action item 1", "action item 2", ...]
}
Keep action items short (max 8 words each). Max 5 action items. Return only raw JSON.`
                        },
                        { role: 'user', content: `Meeting chat:\n${chatText}` }
                    ],
                    max_tokens: 400,
                    temperature: 0.2
                })
            });

            const data = await response.json();
            const raw = data.choices?.[0]?.message?.content || '';
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return;

            const parsed = JSON.parse(jsonMatch[0]);
            setNotesSummary(parsed.summary);

            // Auto-create Kanban tasks from action items
            for (const item of (parsed.action_items || [])) {
                await supabase.from('tasks').insert({
                    room_id: roomId,
                    title: `[Meeting] ${item}`,
                    status: 'todo',
                    priority: 'medium',
                    user_id: user.id
                });
            }

            setTimeout(() => setNotesSummary(null), 8000);
        } catch (err) {
            console.error('Meeting notes error:', err);
        } finally {
            setIsGeneratingNotes(false);
        }
    };

    const toggleMute = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => {
                track.enabled = isVideoOff;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const huddleCount = others.filter(other => (other.presence as any).isInHuddle).length + (isInHuddle ? 1 : 0);

    return (
        <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">

            {/* AI Meeting Notes Toast */}
            {(isGeneratingNotes || notesSummary) && (
                <div className="max-w-xs apple-glass px-4 py-3 rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 animate-apple-fade-in">
                    {isGeneratingNotes ? (
                        <div className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-indigo-400" />
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Generating meeting notes...</span>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">📋 AI Meeting Notes</p>
                            <p className="text-xs text-white/70 leading-relaxed">{notesSummary}</p>
                            <p className="text-[9px] text-white/30">Action items added to Task Board</p>
                        </div>
                    )}
                </div>
            )}

            {/* Huddle Status */}
            {huddleCount > 0 && (
                <div className="apple-glass px-4 py-2 rounded-xl border-white/10 shadow-2xl animate-apple-fade-in">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                            {huddleCount} in huddle
                        </span>
                    </div>
                </div>
            )}

            {/* Video Bubbles */}
            <div className="flex flex-col gap-3">
                {/* Self Video */}
                {isInHuddle && (
                    <div className="relative group animate-apple-fade-in">
                        <div className="w-32 h-32 rounded-3xl overflow-hidden apple-glass border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={cn(
                                    "w-full h-full object-cover",
                                    isVideoOff && "hidden"
                                )}
                            />
                            {isVideoOff && (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
                                    <span className="text-2xl font-black text-white">
                                        {self?.info?.name?.[0]?.toUpperCase() || 'Y'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-apple">
                            <button
                                onClick={toggleMute}
                                className={cn(
                                    "p-2 rounded-xl transition-apple shadow-lg",
                                    isMuted
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : "apple-glass border-white/10 text-white/60 hover:text-white"
                                )}
                            >
                                {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={cn(
                                    "p-2 rounded-xl transition-apple shadow-lg",
                                    isVideoOff
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : "apple-glass border-white/10 text-white/60 hover:text-white"
                                )}
                            >
                                {isVideoOff ? <VideoOff size={12} /> : <Video size={12} />}
                            </button>
                            <button
                                onClick={leaveHuddle}
                                className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 transition-apple hover:bg-red-500/30 shadow-lg"
                            >
                                <PhoneOff size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Other Users' Bubbles (Placeholder) */}
                {others.filter(other => (other.presence as any).isInHuddle).map(({ connectionId, info }) => (
                    <div key={connectionId} className="w-32 h-32 rounded-3xl overflow-hidden apple-glass border-2 border-white/10 shadow-2xl animate-apple-fade-in">
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                            <span className="text-2xl font-black text-white">
                                {info?.name?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Join Button */}
            {!isInHuddle && (
                <button
                    onClick={joinHuddle}
                    className="group px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-apple flex items-center gap-2"
                >
                    <Video size={16} />
                    Join Huddle
                </button>
            )}
        </div>
    );
}
