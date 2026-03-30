import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus,
    Layout,
    Users,
    Clock,
    ArrowRight,
    Loader2,
    LogOut,
    Search,
    Sparkles,
    Terminal,
    Activity,
    Settings,
    Shield,
    Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { DashboardAI } from '../components/DashboardAI';
import CreateRoomModal from '../components/CreateRoomModal';

interface Room {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [taskCount, setTaskCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);

    useEffect(() => {
        fetchRooms();
    }, [user]);

    async function fetchRooms() {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select(`
                    *,
                    room_members!inner(user_id)
                `)
                .eq('room_members.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const fetchedRooms = data || [];
            setRooms(fetchedRooms);

            // Fetch real stats across all user rooms
            if (fetchedRooms.length > 0) {
                const roomIds = fetchedRooms.map((r: Room) => r.id);
                const [{ count: tc }, { count: mc }] = await Promise.all([
                    supabase.from('tasks').select('*', { count: 'exact', head: true }).in('room_id', roomIds),
                    supabase.from('messages').select('*', { count: 'exact', head: true }).in('room_id', roomIds),
                ]);
                setTaskCount(tc || 0);
                setMessageCount(mc || 0);
            }
        } catch (err) {
            console.error('Error fetching rooms:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen w-full overflow-hidden p-6 gap-6 relative bg-black">
            {/* SaaS Sidebar */}
            <aside className="apple-glass-heavy w-72 flex flex-col rounded-[2.5rem] shadow-2xl transition-apple border-white/5 overflow-hidden">
                <div className="p-8 flex items-center gap-4">
                    <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-indigo-600 font-extrabold text-white shadow-lg shadow-indigo-500/20">
                        CC
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter text-white">Workspace OS</h1>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none mt-1">SaaS Edition v1.0</p>
                    </div>
                </div>

                <div className="flex-1 px-4 space-y-6 pt-4">
                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">Main</p>
                        <SidebarLink icon={<Layout size={18} />} label="All Rooms" active />
                        <Link to="/friends">
                            <SidebarLink icon={<Users size={18} />} label="Team Members" />
                        </Link>
                        <Link to="/activity">
                            <SidebarLink icon={<Activity size={18} />} label="Activity Feed" />
                        </Link>
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">Resources</p>
                        <SidebarLink icon={<Globe size={18} />} label="Shared Links" />
                        <SidebarLink icon={<Shield size={18} />} label="Admin Console" />
                        <Link to="/settings">
                            <SidebarLink icon={<Settings size={18} />} label="Settings" />
                        </Link>
                    </div>
                </div>

                {/* User Profile Hook */}
                <div className="p-6 mt-auto border-t border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4 p-3 rounded-2xl apple-glass border-white/10 hover:bg-white/5 transition-apple cursor-pointer group">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                            alt="avatar"
                            className="h-10 w-10 rounded-full border-2 border-indigo-500/50"
                        />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{user?.email?.split('@')[0]}</p>
                            <p className="text-[10px] font-semibold text-white/20 truncate lowercase">Pro Membership</p>
                        </div>
                        <button onClick={signOut} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-apple">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Command Center Canvas */}
            <main className="flex-1 flex flex-col apple-glass-heavy rounded-[2.5rem] overflow-hidden shadow-2xl border-white/5 relative bg-white/[0.01]">
                {/* Header / Search Area */}
                <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-8 flex-1 max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 transition-apple" />
                            <input
                                type="text"
                                placeholder="Search workspaces, files, or team members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 w-full apple-glass-heavy border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-apple"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 ml-10">
                        <div className="flex items-center gap-2 px-4 py-2 apple-glass rounded-xl border-white/5">
                            <Sparkles size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Pulse Insights Active</span>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <button className="h-10 w-10 flex items-center justify-center rounded-xl apple-glass border-white/5 text-white/40 hover:text-white transition-apple">
                            <Terminal size={18} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                    {/* Welcome & Stats Row */}
                    <div className="flex flex-col gap-10 mb-12">
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-2 animate-apple-fade-in">Good Evening, Collaborator.</h2>
                            <p className="text-lg text-white/30 font-medium">You have <span className="text-indigo-400 font-bold">{rooms.length} active workspaces</span> to manage today.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-apple-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <StatCard label="Total Rooms" value={rooms.length} trend="+2 new" color="indigo" />
                            <StatCard label="Total Messages" value={messageCount} trend="Across rooms" color="green" />
                            <StatCard label="Tasks Done" value={taskCount} trend="All rooms" color="blue" />
                            <StatCard label="Team Members" value="—" trend="Join rooms" color="purple" />
                        </div>
                    </div>

                    {/* Room Creation & Grid */}
                    <div className="space-y-8 animate-apple-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Active Workspaces</h3>
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            </div>

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-10 px-6 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-apple flex items-center gap-2"
                            >
                                <Plus size={14} />
                                New Workspace
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-indigo-500/50" />
                            </div>
                        ) : filteredRooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredRooms.map((room) => (
                                    <RoomCard key={room.id} room={room} />
                                ))}
                            </div>
                        ) : (
                            <div className="h-80 rounded-[3rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-center p-10 bg-white/[0.01]">
                                <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 text-white/20">
                                    <Layout size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-white/80">Launch Your First Space</h4>
                                <p className="text-sm text-white/30 max-w-sm mt-2 font-medium">Create a workspace above to start building with your team in high-fidelity glassmorphism.</p>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors"
                                >
                                    Create Now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <DashboardAI />
            <CreateRoomModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onRoomCreated={() => {
                    fetchRooms();
                    // Navigation happens inside modal for now, or we can move it here
                }}
            />
        </div>
    );
}

function SidebarLink({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-apple",
            active
                ? "apple-glass text-indigo-400 shadow-xl shadow-indigo-500/5 border border-white/5"
                : "text-white/30 hover:bg-white/5 hover:text-white"
        )}>
            {icon}
            <span className="text-xs font-bold leading-none">{label}</span>
        </div>
    );
}

function StatCard({ label, value, trend, color }: any) {
    const colorMap: any = {
        indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        green: "text-green-400 bg-green-500/10 border-green-500/20",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    };

    return (
        <div className="apple-glass rounded-3xl p-6 border-white/5 shadow-xl hover:scale-[1.02] transition-apple group">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">{label}</p>
            <div className="flex items-end justify-between">
                <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
                <div className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", colorMap[color])}>
                    {trend}
                </div>
            </div>
        </div>
    );
}

function RoomCard({ room }: { room: Room }) {
    return (
        <Link
            to={`/room/${room.id}`}
            className="group relative h-64 apple-glass rounded-[2.5rem] p-8 border-white/5 shadow-2xl overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-apple"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-apple duration-700" />

            <div className="relative h-full flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-apple shadow-inner">
                        <Layout size={28} />
                    </div>
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <img
                                key={i}
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.id}${i}`}
                                className="h-8 w-8 rounded-full border-4 border-black group-hover:border-indigo-900/50 transition-apple"
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-indigo-400 transition-apple">{room.name}</h3>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                            <Clock size={12} />
                            {new Date(room.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-500/60 uppercase tracking-widest">
                            <Activity size={12} />
                            Active now
                        </div>
                    </div>
                </div>

                <div className="absolute right-8 bottom-8 h-10 w-10 rounded-full apple-glass border-white/10 flex items-center justify-center text-white opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-apple">
                    <ArrowRight size={20} />
                </div>
            </div>
        </Link>
    );
}
