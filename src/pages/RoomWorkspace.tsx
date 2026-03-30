import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomProvider, useOthers, useSelf } from '../liveblocks.config';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import {
    Layout,
    MessageSquare,
    Settings,
    CheckSquare,
    CircleOff,
    Users,
    Play,
    Terminal,
    Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CollaborativeEditor } from '../components/CollaborativeEditor';
import { ChatModule } from '../components/ChatModule';
import { TaskBoard } from '../components/TaskBoard';
import { Whiteboard } from '../components/Whiteboard';
import { AIPulse } from '../components/AIPulse';
import { CommandPalette } from '../components/CommandPalette';
import { LivePreview } from '../components/LivePreview';
import { FileExplorer } from '../components/FileExplorer';
import { HuddleBubbles } from '../components/HuddleBubbles';
import { CollaborativeTerminal } from '../components/CollaborativeTerminal';
import { ActivityFeed } from '../components/ActivityFeed';
import { Layer, FileData, useMutation, useStorage, useBroadcastEvent } from '../liveblocks.config';
import ShareRoomModal from '../components/ShareRoomModal';
import { RoomSettingsModal } from '../components/RoomSettingsModal';
import { Activity } from 'lucide-react';

export default function RoomWorkspace() {
    const { roomId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'editor' | 'tasks' | 'chat' | 'board'>('editor');
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(true);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);

    // Global Key Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
                setIsAIOpen(false);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                e.preventDefault();
                setIsAIOpen(prev => !prev);
                setIsPaletteOpen(false);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
                e.preventDefault();
                setIsPreviewOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsAIOpen(false);
                setIsPaletteOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!roomId) return null;

    const initialStorage = useMemo(() => ({
        layers: new LiveMap<string, LiveObject<Layer>>(),
        layerIds: new LiveList<string>([]),
        files: new LiveMap<string, LiveObject<FileData>>(),
    }), []);

    return (
        <AutoJoinWrapper roomId={roomId} userId={user?.id}>
            <RoomProvider
                id={roomId}
                initialPresence={{
                    cursor: null,
                    selectedLayerId: null,
                    pencilColor: null,
                    isTyping: false,
                    activeFileId: null
                }}
                initialStorage={initialStorage}
            >
                <RoomContent
                    roomId={roomId}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    user={user}
                    navigate={navigate}
                    isAIOpen={isAIOpen}
                    setIsAIOpen={setIsAIOpen}
                    isPaletteOpen={isPaletteOpen}
                    setIsPaletteOpen={setIsPaletteOpen}
                    isPreviewOpen={isPreviewOpen}
                    setIsPreviewOpen={setIsPreviewOpen}
                    isTerminalOpen={isTerminalOpen}
                    setIsTerminalOpen={setIsTerminalOpen}
                    isShareOpen={isShareOpen}
                    setIsShareOpen={setIsShareOpen}
                    isSettingsOpen={isSettingsOpen}
                    setIsSettingsOpen={setIsSettingsOpen}
                    isActivityOpen={isActivityOpen}
                    setIsActivityOpen={setIsActivityOpen}
                />
            </RoomProvider>
        </AutoJoinWrapper>
    );
}

// ─── Auto-Join Wrapper ────────────────────────────────────────────────────────
function AutoJoinWrapper({ roomId, userId, children }: { roomId: string; userId?: string; children: React.ReactNode }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');

    useEffect(() => {
        if (!userId) { navigate('/auth'); return; }

        const ensureMembership = async () => {
            // Check if already a member
            const { data: existing } = await supabase
                .from('room_members')
                .select('id')
                .eq('room_id', roomId)
                .eq('user_id', userId)
                .maybeSingle();

            if (existing) { setStatus('ready'); return; }

            // Verify room exists before joining
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('id', roomId)
                .maybeSingle();

            if (!room) { setStatus('error'); return; }

            // Auto-join as member
            const { error } = await supabase
                .from('room_members')
                .insert({ room_id: roomId, user_id: userId, role: 'member' });

            if (error && error.code !== '23505') { // 23505 = duplicate, already a member
                console.error('[AutoJoin] Failed:', error);
                setStatus('error');
                return;
            }
            setStatus('ready');
        };

        ensureMembership();
    }, [roomId, userId]);

    if (status === 'checking') return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-black gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20 animate-pulse">
                <Users size={24} className="text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Joining workspace...</p>
        </div>
    );

    if (status === 'error') return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-black gap-4">
            <p className="text-sm font-bold text-red-400">Room not found or access denied.</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-indigo-600 rounded-xl text-sm text-white font-bold">Back to Dashboard</button>
        </div>
    );

    return <>{children}</>;
}

// ─── Room Content ─────────────────────────────────────────────────────────────
function RoomContent({
    roomId,
    activeTab,
    setActiveTab,
    user,
    navigate,
    isAIOpen,
    setIsAIOpen,
    isPaletteOpen,
    setIsPaletteOpen,
    isPreviewOpen,
    setIsPreviewOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    isShareOpen,
    setIsShareOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isActivityOpen,
    setIsActivityOpen
}: any) {
    const others = useOthers();
    const self = useSelf();
    const broadcastActivity = useBroadcastEvent();

    useEffect(() => {
        if (self?.info?.name) {
            broadcastActivity({ type: 'member_joined', userName: self.info.name });
        }
    }, [self?.info?.name, broadcastActivity]);

    const files = useStorage(root => root.files);

    const seedWorkspace = useMutation(({ storage }, templateFiles: any[]) => {
        const filesMap = storage.get("files");
        if (filesMap.size > 0) return; // Don't overwrite if files already exist

        templateFiles.forEach(file => {
            const id = Math.random().toString(36).substring(2, 10);
            filesMap.set(id, new LiveObject({
                name: file.name,
                content: file.content,
                type: "file"
            }));
        });
    }, []);

    useEffect(() => {
        if (!files) return;

        const templateData = localStorage.getItem(`room-template-${roomId}`);
        if (templateData) {
            try {
                const templateFiles = JSON.parse(templateData);
                seedWorkspace(templateFiles);
                localStorage.removeItem(`room-template-${roomId}`);
            } catch (e) {
                console.error("Failed to seed workspace:", e);
            }
        }
    }, [files, roomId, seedWorkspace]);

    return (
        <div className="flex h-screen w-full overflow-hidden p-6 gap-6 relative">
            {/* Apple Inspired Side Dock */}
            <aside className="apple-glass-heavy w-20 flex flex-col items-center py-8 rounded-[2.5rem] shadow-2xl transition-apple border-white/5">
                <div
                    onClick={() => navigate('/')}
                    className="h-12 w-12 flex items-center justify-center rounded-2xl bg-indigo-600 font-black text-white cursor-pointer hover:scale-110 active:scale-95 transition-apple shadow-lg shadow-indigo-500/30 mb-10"
                >
                    CC
                </div>

                <div className="flex-1 flex flex-col gap-8">
                    <SidebarIcon
                        icon={<Layout size={22} />}
                        active={activeTab === 'editor'}
                        onClick={() => setActiveTab('editor')}
                        label="Editor"
                    />
                    <SidebarIcon
                        icon={<CheckSquare size={22} />}
                        active={activeTab === 'tasks'}
                        onClick={() => setActiveTab('tasks')}
                        label="Tasks"
                    />
                    <SidebarIcon
                        icon={<CircleOff size={22} />}
                        active={activeTab === 'board'}
                        onClick={() => setActiveTab('board')}
                        label="Board"
                    />
                    <SidebarIcon
                        icon={<MessageSquare size={22} />}
                        active={activeTab === 'chat'}
                        onClick={() => setActiveTab('chat')}
                        label="Chat"
                    />
                    <SidebarIcon
                        icon={<Activity size={22} />}
                        active={isActivityOpen}
                        onClick={() => setIsActivityOpen(!isActivityOpen)}
                        label="Activity"
                    />
                </div>

                <div className="flex flex-col gap-6 items-center">
                    <button
                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                        className={cn(
                            "p-3 rounded-xl transition-apple",
                            isPreviewOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Play size={20} />
                    </button>
                    <button
                        onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                        className={cn(
                            "p-3 rounded-xl transition-apple",
                            isTerminalOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                        title="Toggle Terminal"
                    >
                        <Terminal size={20} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 text-white/40 hover:text-white transition-apple hover:bg-white/5 rounded-xl"
                        title="Room Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => navigate(`/admin/${roomId}`)}
                        className="p-3 text-white/40 hover:text-amber-400 transition-apple hover:bg-white/5 rounded-xl"
                        title="Admin Console"
                    >
                        <Shield size={20} />
                    </button>

                    <div className="relative group p-1 ring-1 ring-white/10 rounded-full">
                        <img
                            src={self?.info?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                            alt="Me"
                            className="h-10 w-10 rounded-full border-2 border-indigo-500/50"
                        />
                        <div className="absolute left-14 top-1/2 -translate-y-1/2 apple-glass-heavy px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-apple pointer-events-none whitespace-nowrap text-xs font-bold border-white/10">
                            Me: {self?.info?.name || 'User'}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 flex flex-col apple-glass-heavy rounded-[2.5rem] overflow-hidden shadow-2xl border-white/5 relative">
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1.5 mr-4" onClick={() => setIsPaletteOpen(true)}>
                            <div className="w-3 h-3 rounded-full bg-red-500/50 cursor-pointer" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50 cursor-pointer" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50 cursor-pointer" />
                        </div>
                        <h1 className="text-sm font-bold tracking-tight text-white/90 cursor-default select-none">
                            Shared Space <span className="mx-2 text-white/20">/</span> <span className="text-indigo-400">room_{roomId.substring(0, 8)}</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Collaborative User Cluster */}
                        <div className="flex -space-x-2">
                            {others.map(({ connectionId, info }) => (
                                <img
                                    key={connectionId}
                                    src={info?.avatar || `https://liveblocks.io/avatars/avatar-${connectionId % 30}.png`}
                                    className="w-8 h-8 rounded-full border-2 border-[#0c0c0e]"
                                    alt={info?.name || "Anonymous"}
                                    title={info?.name || "Anonymous"}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => setIsShareOpen(true)}
                            className="apple-glass px-5 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-apple border-white/10 flex items-center gap-2"
                        >
                            <Users size={14} />
                            Share
                        </button>
                    </div>
                </header>

                <div className="flex-1 relative flex overflow-hidden bg-black/20">
                    {/* ... content ... */}
                    {/* File Explorer (Visible always when in Editor mode for now) */}
                    {activeTab === 'editor' && <FileExplorer />}

                    <div className="flex-1 relative overflow-hidden">
                        {activeTab === 'editor' && <CollaborativeEditor />}
                        {activeTab === 'tasks' && <TaskBoard roomId={roomId} />}
                        {activeTab === 'board' && <Whiteboard />}
                        {activeTab === 'chat' && <ChatModule roomId={roomId} />}
                    </div>

                    {isPreviewOpen && (
                        <div className="w-[40%] border-l border-white/5">
                            <LivePreview />
                        </div>
                    )}
                </div>

                {/* Terminal Panel */}
                {isTerminalOpen && <CollaborativeTerminal roomId={roomId} />}

                {/* AI Spotlight Bar Trigger */}
                {!isAIOpen && (
                    <div
                        onClick={() => setIsAIOpen(true)}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 apple-glass-heavy rounded-full border-white/10 cursor-pointer hover:scale-105 transition-apple shadow-2xl group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-xs font-bold text-white/40 group-hover:text-white/60 transition-apple italic">
                                Ask AI Pulse... (⌘I)
                            </span>
                        </div>
                    </div>
                )}

                {/* Huddle Bubbles Overlay */}
                <HuddleBubbles roomId={roomId} />
            </main>

            {/* Global Overlays */}
            {isAIOpen && <AIPulse isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />}
            {isPaletteOpen && <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />}
            <ShareRoomModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} roomId={roomId} />
            <RoomSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} roomId={roomId} />
            <ActivityFeed isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />
        </div>
    );
}

function SidebarIcon({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative h-12 w-12 flex items-center justify-center rounded-2xl transition-apple",
                active
                    ? "apple-glass text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    : "text-white/30 hover:text-white/60 hover:bg-white/5"
            )}
        >
            {icon}
            <div className="absolute left-full ml-3 z-50 apple-glass-heavy px-3 py-1.5 rounded-lg text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-apple pointer-events-none whitespace-nowrap shadow-xl border-white/10">
                {label}
            </div>
            {active && (
                <div className="absolute -left-6 h-1 w-1 rounded-full bg-indigo-400 blur-[2px]" />
            )}
        </button>
    );
}
