import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
    User,
    Mail,
    Globe,
    Save,
    Loader2,
    ArrowLeft,
    Camera,
    Upload
} from 'lucide-react';

export default function UserSettings() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile state
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (user) {
            getProfile();
            setEmail(user.email || '');
        }
    }, [user]);

    async function getProfile() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();

            if (error) throw error;

            if (data) {
                setFullName(data.full_name || '');
                setUsername(data.username || '');
                setBio(data.bio || ''); // Ensure these columns exist in DB or this might fail silently/loudly
                setWebsite(data.website || '');
                setAvatarUrl(data.avatar_url || '');
            }
        } catch (error) {
            console.error('Error loading user data!', error);
        }
    }

    async function updateProfile() {
        try {
            setSaving(true);
            setMessage(null);

            const updates = {
                id: user!.id,
                full_name: fullName,
                username,
                bio,      // Will fail if column doesn't exist. I need to verify schema or use JSONB if desperate.
                website,  // Same here
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Error updating profile!', error);
            setMessage({ type: 'error', text: 'Error updating profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    }

    // Generate a random avatar seeded by ID if none exists
    const displayAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <div className="sticky top-0 z-50 apple-glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight">Account Settings</h1>
                </div>
            </div>

            <main className="max-w-3xl mx-auto p-6 md:p-12">
                <div className="space-y-12">

                    {/* Profile Section */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-2">Public Profile</h2>
                            <p className="text-white/40">This is how you will appear to other collaborators.</p>
                        </div>

                        {/* Avatar */}
                        <div className="flex items-center gap-8">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-indigo-500/50 transition-colors">
                                    <img src={displayAvatar} alt="Profile" className="h-full w-full object-cover" />
                                </div>
                                <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-not-allowed" title="Upload coming soon">
                                    <Camera size={24} className="text-white" />
                                </button>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Profile Picture</h3>
                                <p className="text-xs text-white/40 mb-3">Supports JPG, PNG or GIF. Max 5MB.</p>
                                <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2 cursor-not-allowed opacity-50">
                                    <Upload size={14} />
                                    Upload New
                                </button>
                            </div>
                        </div>

                        {/* Form Grid */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Full Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Your Name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Username</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm font-bold">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                                        placeholder="username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
                                    placeholder="Tell us a little bit about yourself..."
                                />
                                <div className="text-[10px] text-white/20 text-right">{bio.length} / 160</div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Website</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                    <input
                                        type="url"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                        placeholder="https://your-portfolio.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white/50 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center gap-4 pt-4">
                            <button
                                onClick={updateProfile}
                                disabled={saving}
                                className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Changes
                            </button>
                            {message && (
                                <div className={`text-sm font-bold ${message.type === 'success' ? 'text-green-400' : 'text-red-400'} animate-in fade-in slide-in-from-left-2`}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
