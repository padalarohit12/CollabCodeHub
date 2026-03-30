import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
    Activity,
    Users,
    Clock,
    ArrowLeft,
    Zap,
    GitCommit
} from 'lucide-react';

interface ActivityItem {
    id: string; // room id
    name: string;
    updated_at: string;
    created_at: string;
    member_count: number;
    last_active: string; // derived
}

export default function ActivityFeedPage() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchActivity();
    }, [user]);

    async function fetchActivity() {
        try {
            setLoading(true);
            // Fetch rooms user is a member of
            const { data: rooms, error } = await supabase
                .from('rooms')
                .select(`
                    id,
                    name,
                    updated_at,
                    created_at,
                    room_members!inner(user_id)
                `)
                .eq('room_members.user_id', user!.id)
                .order('updated_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // For each room, get member count (approximated from the inner join or separate query if needed)
            // The !inner join above filters rows, but if we want total count we might need a separate count query
            // for accurate "total members in room". 
            // Let's do a quick separate fetch for counts to be accurate.

            const enriched = await Promise.all(rooms.map(async (room: any) => {
                const { count } = await supabase
                    .from('room_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_id', room.id);

                return {
                    id: room.id,
                    name: room.name,
                    updated_at: room.updated_at,
                    created_at: room.created_at,
                    member_count: count || 1,
                    last_active: new Date(room.updated_at).toLocaleTimeString()
                };
            }));

            setActivities(enriched);
        } catch (error) {
            console.error("Error fetching activity:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12 selection:bg-indigo-500/30">
            <header className="mb-12 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="text-indigo-400" />
                        <h1 className="text-3xl font-black tracking-tighter">Live Activity</h1>
                    </div>
                    <p className="text-white/40">Real-time pulse of your workspaces and team.</p>
                </div>
                <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Dashboard
                </Link>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Recent Updates</h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 rounded-3xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : activities.length > 0 ? (
                        activities.map((item) => (
                            <Link
                                key={item.id}
                                to={`/room/${item.id}`}
                                className="block p-6 apple-glass rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {item.name}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(item.updated_at).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} />
                                                    {item.member_count} members
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-white/20 bg-white/5 px-3 py-1 rounded-full">
                                        Active {item.last_active}
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-10 text-center text-white/30 border border-dashed border-white/10 rounded-3xl">
                            No recent activity found.
                        </div>
                    )}
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="p-6 apple-glass rounded-[2rem] border border-white/5">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <GitCommit size={20} className="text-green-400" />
                            Velocity
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-white/60">Active Rooms</span>
                                <span className="text-xl font-black">{activities.length}</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-3/4" />
                            </div>
                            <div className="text-xs text-white/30 pt-2">
                                You're in the top 10% of active developers this week.
                            </div>
                        </div>
                    </div>

                    <div className="p-6 apple-glass rounded-[2rem] border border-white/5">
                        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link to="/friends" className="block w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors text-center">
                                Invite Team
                            </Link>
                            <Link to="/dashboard" className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold transition-colors text-center shadow-lg shadow-indigo-500/20">
                                New Workspace
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
