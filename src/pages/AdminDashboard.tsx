import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, Shield, Sliders, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ tasks: 0, messages: 0, layers: 0 });

    useEffect(() => {
        if (roomId && user) {
            fetchAdminData();
        }
    }, [roomId, user]);

    async function fetchAdminData() {
        try {
            // 1. Verify Access
            const { data: member, error: memberError } = await supabase
                .from('room_members')
                .select('role')
                .eq('room_id', roomId)
                .eq('user_id', user!.id)
                .single();

            if (memberError || member.role !== 'admin') {
                alert('Access Denied: You must be an admin to view this console.');
                navigate(`/room/${roomId}`);
                return;
            }

            // 2. Fetch Room Details
            const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
            setRoom(roomData);

            // 3. Fetch Members
            const { data: membersData } = await supabase
                .from('room_members')
                .select('*, profiles(full_name, username, avatar_url)')
                .eq('room_id', roomId);
            setMembers(membersData || []);

            // 4. Fetch Quick Stats (Mock-ish for performance, or real counts)
            const { count: taskCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('room_id', roomId);
            const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('room_id', roomId);

            setStats({
                tasks: taskCount || 0,
                messages: msgCount || 0,
                layers: 12 // Placeholder or fetch from storage if possible
            });

        } catch (error) {
            console.error("Admin Load Error:", error);
        } finally {
            setLoading(false);
        }
    }

    const updateRole = async (memberId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('room_members')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;
            setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        } catch (error) {
            console.error("Role Update Error:", error);
            alert("Failed to update role");
        }
    };

    const generateReport = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');

            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.text(`Project Report: ${room?.name || 'Untitled'}`, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on ${new Date().toLocaleDateString()} by ${user?.email}`, 14, 30);

            // Stats
            doc.setFontSize(12);
            doc.text("Project Statistics", 14, 45);

            const statsData = [
                ['Total Tasks', stats.tasks],
                ['Total Messages', stats.messages],
                ['Team Members', members.length]
            ];

            (doc as any).autoTable({
                startY: 50,
                head: [['Metric', 'Value']],
                body: statsData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }
            });

            // Members Table
            const finalY = (doc as any).lastAutoTable.finalY || 50;
            doc.text("Team Members", 14, finalY + 15);

            const membersData = members.map(m => [
                m.profiles?.full_name || 'N/A',
                m.profiles?.username || 'N/A',
                m.role.toUpperCase()
            ]);

            (doc as any).autoTable({
                startY: finalY + 20,
                head: [['Name', 'Username', 'Role']],
                body: membersData,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] }
            });

            doc.save(`${room?.name}_Report.pdf`);
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-black text-white">Loading Admin Console...</div>;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="h-20 border-b border-indigo-500/10 bg-[#0c0c0e] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/room/${roomId}`)}
                        className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/50 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                            <Shield className="text-indigo-500" size={20} />
                            Admin Console
                        </h1>
                        <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{room?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-500">SYSTEM ONLINE</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Stats Row */}
                <div className="col-span-1 md:col-span-3 grid grid-cols-3 gap-6">
                    <StatBox label="Total Tasks" value={stats.tasks} icon={<CheckCircle2 size={24} className="text-indigo-400" />} />
                    <StatBox label="Messages" value={stats.messages} icon={<AlertTriangle size={24} className="text-pink-400" />} />
                    <StatBox label="Team Size" value={members.length} icon={<Users size={24} className="text-emerald-400" />} />
                </div>

                {/* Member Management */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <div className="apple-glass-heavy rounded-3xl p-8 border border-white/5 bg-[#0f0f12]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold flex items-center gap-3">
                                <Users size={20} className="text-indigo-400" />
                                Role Management
                            </h2>
                            <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                {members.length} Active Users
                            </div>
                        </div>

                        <div className="space-y-4">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                            className="h-10 w-10 rounded-xl bg-slate-800"
                                        />
                                        <div>
                                            <div className="font-bold text-sm text-white">
                                                {member.profiles?.full_name || "Unknown User"}
                                            </div>
                                            <div className="text-xs text-white/40 font-mono">
                                                @{member.profiles?.username}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <select
                                            value={member.role}
                                            onChange={(e) => updateRole(member.id, e.target.value)}
                                            className={cn(
                                                "h-9 px-3 rounded-lg bg-black border border-white/10 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500 transition-all cursor-pointer",
                                                member.role === 'admin' ? "text-amber-400" : "text-slate-400"
                                            )}
                                            disabled={member.user_id === user?.id} // Can't change own role
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="member">Member</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Settings Panel */}
                <div className="col-span-1 space-y-6">
                    <div className="apple-glass-heavy rounded-3xl p-8 border border-white/5 bg-[#0f0f12]">
                        <h2 className="text-lg font-bold flex items-center gap-3 mb-6">
                            <Sliders size={20} className="text-indigo-400" />
                            Workspace Settings
                        </h2>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Room Slug</label>
                                <div className="font-mono text-xs text-indigo-400 truncate">{room?.slug}</div>
                            </div>

                            <button
                                onClick={generateReport}
                                className="w-full py-3 rounded-xl bg-indigo-600/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                Export Data (PDF)
                            </button>

                            <button
                                onClick={async () => {
                                    if (!confirm(`Archive "${room?.name}"? This will delete the room and all its data permanently.`)) return;
                                    try {
                                        const { error } = await supabase.from('rooms').delete().eq('id', roomId);
                                        if (error) throw error;
                                        navigate('/dashboard');
                                    } catch (err: any) {
                                        alert('Failed to archive workspace: ' + err.message);
                                    }
                                }}
                                className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
                            >
                                Archive Workspace
                            </button>
                        </div>
                    </div>

                    <div className="apple-glass-heavy rounded-3xl p-8 border border-white/5 bg-[#0f0f12]">
                        <h2 className="text-lg font-bold flex items-center gap-3 mb-4">
                            <Activity size={20} className="text-indigo-400" />
                            Audit Log
                        </h2>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="text-xs text-white/50 flex gap-2">
                                    <span className="text-indigo-400">•</span>
                                    <span>Settings updated by Admin</span>
                                    <span className="ml-auto text-white/20">2m</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}

function StatBox({ label, value, icon }: any) {
    return (
        <div className="apple-glass-heavy rounded-3xl p-6 border border-white/5 bg-[#0f0f12] flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <div className="text-2xl font-black text-white tracking-tighter">{value}</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</div>
            </div>
        </div>
    )
}
