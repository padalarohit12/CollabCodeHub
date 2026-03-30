import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    UserPlus,
    Loader2,
    Mail,
    MoreHorizontal,
    MessageSquare,
    Check,
    X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Friend {
    id: string; // The friendship ID
    friend_id: string; // The user ID of the friend
    status: 'pending' | 'accepted';
    initiator_id: string; // Who started it
    profile: {
        id: string;
        full_name: string;
        username: string;
        avatar_url: string;
        email?: string;
    };
}

export default function FriendsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'add'>('all');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [addEmail, setAddEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addResult, setAddResult] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) fetchFriends();
    }, [user, activeTab]);

    async function fetchFriends() {
        if (!user) return;
        try {
            // Fetch friendships where user is either initiator or receiver
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    status,
                    user_id,
                    friend_id
                `)
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

            if (error) throw error;

            // Enrich with profile data manually since we have two potential foreign keys
            // This is a bit inefficient but works without complex joins for now
            const enrichedFriends = await Promise.all(
                (data || []).map(async (f: any) => {
                    const isInitiator = f.user_id === user.id;
                    const targetId = isInitiator ? f.friend_id : f.user_id;

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, full_name, username, avatar_url, email')
                        .eq('id', targetId)
                        .single();

                    return {
                        id: f.id,
                        friend_id: targetId,
                        status: f.status,
                        initiator_id: f.user_id,
                        profile: profile || { id: targetId, full_name: 'Unknown', username: 'unknown', avatar_url: '' }
                    };
                })
            );

            setFriends(enrichedFriends);
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    }

    async function handleAddFriend(e: React.FormEvent) {
        e.preventDefault();
        if (!addEmail.trim()) return;

        setIsAdding(true);
        setAddResult(null);

        try {
            // 1. Find user by email (or username)
            // Note: Email search might fail if migration didn't run. Fallback to username?
            // "i wanna add people using their email" - User Requirement.
            const query = addEmail.trim();

            // Try searching by email column first (requires migration)
            let { data: targetUser } = await supabase
                .from('profiles')
                .select('id, email, username')
                .eq('email', query)
                .single();

            // If not found by email, try username
            if (!targetUser) {
                const { data: targetUserByUsername } = await supabase
                    .from('profiles')
                    .select('id, email, username')
                    .eq('username', query)
                    .single();
                targetUser = targetUserByUsername;
            }

            if (!targetUser) {
                setAddResult({ type: 'error', text: 'User not found. Check email or username.' });
                return;
            }

            if (targetUser.id === user?.id) {
                setAddResult({ type: 'error', text: 'You cannot add yourself.' });
                return;
            }

            // 2. Check if friendship already exists
            const existing = friends.find(f => f.friend_id === targetUser.id);
            if (existing) {
                setAddResult({ type: 'error', text: existing.status === 'accepted' ? 'Already friends!' : 'Request already pending.' });
                return;
            }

            // 3. Insert friendship
            const { error: insertError } = await supabase
                .from('friendships')
                .insert({
                    user_id: user!.id,
                    friend_id: targetUser.id,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            setAddResult({ type: 'success', text: 'Friend request sent!' });
            setAddEmail('');
            fetchFriends(); // Refresh list
        } catch (err: any) {
            console.error(err);
            setAddResult({ type: 'error', text: err.message || 'Failed to send request.' });
        } finally {
            setIsAdding(false);
        }
    }

    async function handleAction(friendshipId: string, action: 'accept' | 'reject' | 'cancel') {
        try {
            if (action === 'accept') {
                await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
            } else {
                await supabase.from('friendships').delete().eq('id', friendshipId);
            }
            fetchFriends();
        } catch (error) {
            console.error(`Error ${action}ing friend:`, error);
        }
    }

    const pendingRequests = friends.filter(f => f.status === 'pending' && f.initiator_id !== user?.id);
    const sentRequests = friends.filter(f => f.status === 'pending' && f.initiator_id === user?.id);
    const acceptedFriends = friends.filter(f => f.status === 'accepted');

    return (
        <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12">
            <header className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter mb-2">My Team</h1>
                    <p className="text-white/40">Manage your network and collaborators.</p>
                </div>
                <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors">
                    Back to Dashboard
                </Link>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-white/10 pb-1">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label={`All Friends (${acceptedFriends.length})`} />
                <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label={`Pending (${pendingRequests.length})`} />
                <TabButton active={activeTab === 'add'} onClick={() => setActiveTab('add')} label="Add Friend" icon={<UserPlus size={14} />} />
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'add' ? (
                    <div className="max-w-xl">
                        <div className="p-8 apple-glass rounded-3xl border border-white/10">
                            <h3 className="text-xl font-bold mb-4">Add a new connection</h3>
                            <p className="text-white/40 text-sm mb-6">Enter an email address or username to send a connection request.</p>

                            <form onSubmit={handleAddFriend} className="space-y-4">
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                    <input
                                        type="text"
                                        value={addEmail}
                                        onChange={(e) => setAddEmail(e.target.value)}
                                        placeholder="friend@example.com or username"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isAdding || !addEmail.trim()}
                                    className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {isAdding ? <Loader2 className="animate-spin mx-auto" /> : "Send Request"}
                                </button>
                            </form>

                            {addResult && (
                                <div className={`mt-4 p-4 rounded-xl text-sm font-bold ${addResult.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {addResult.text}
                                </div>
                            )}
                        </div>

                        {sentRequests.length > 0 && (
                            <div className="mt-8">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Sent Requests</h4>
                                <div className="space-y-3">
                                    {sentRequests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-4 apple-glass rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/50">
                                                    {req.profile.username[0].toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold opacity-70">{req.profile.username}</span>
                                            </div>
                                            <button
                                                onClick={() => handleAction(req.id, 'cancel')}
                                                className="text-white/20 hover:text-red-400 p-2 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'pending' ? (
                    <div className="grid gap-4 max-w-2xl">
                        {pendingRequests.length === 0 ? (
                            <div className="text-white/30 italic py-10">No pending requests.</div>
                        ) : (
                            pendingRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-6 apple-glass rounded-3xl border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <img src={req.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.profile.id}`} className="h-12 w-12 rounded-xl bg-black" />
                                        <div>
                                            <h4 className="font-bold">{req.profile.full_name || req.profile.username}</h4>
                                            <p className="text-xs text-white/40">@{req.profile.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAction(req.id, 'accept')}
                                            className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                        >
                                            <Check size={14} /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'reject')}
                                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                        >
                                            <X size={14} /> Decline
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {acceptedFriends.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-white/20">
                                <p className="mb-4 text-xl font-bold">You haven't added anyone yet.</p>
                                <button onClick={() => setActiveTab('add')} className="text-indigo-400 hover:underline">Add your first friend</button>
                            </div>
                        ) : (
                            acceptedFriends.map(friend => (
                                <div key={friend.id} className="p-6 apple-glass rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex items-start justify-between mb-6">
                                        <img src={friend.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.profile.id}`} className="h-14 w-14 rounded-2xl bg-black shadow-lg" />
                                        <div className="p-2 rounded-xl hover:bg-white/5 text-white/20 cursor-pointer">
                                            <MoreHorizontal size={16} />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black tracking-tight mb-1">{friend.profile.full_name || friend.profile.username}</h3>
                                    <p className="text-xs text-white/40 mb-6">@{friend.profile.username}</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                            title="Go to Dashboard and open a shared room"
                                        >
                                            <MessageSquare size={14} />
                                            Message
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
                                                alert(`Copied dashboard link! Share a room with ${friend.profile.full_name || friend.profile.username} from there.`);
                                            }}
                                            className="py-2 rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
                                        >
                                            Invite to Room
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${active
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
