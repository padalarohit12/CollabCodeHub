import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    X,
    Loader2,
    Mail,
    Plus,
    Check,
    Layout,
    Code2,
    Server,
    Globe,
    Terminal,
    FileCode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TEMPLATES = [
    {
        id: 'blank', name: 'Blank', icon: Layout, color: 'from-slate-700 to-slate-600',
        description: 'Start from scratch',
        files: [{ name: 'README.md', content: '# My Workspace\n\nStart building here.' }]
    },
    {
        id: 'react', name: 'React App', icon: Code2, color: 'from-blue-600 to-cyan-500',
        description: 'React + TypeScript starter',
        files: [
            { name: 'App.tsx', content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div>\n      <h1>Hello, React!</h1>\n    </div>\n  );\n}` },
            { name: 'index.css', content: `body { margin: 0; font-family: sans-serif; }` },
            { name: 'README.md', content: '# React App\n\nBuilt with React + TypeScript.' }
        ]
    },
    {
        id: 'node', name: 'Node API', icon: Server, color: 'from-green-600 to-emerald-500',
        description: 'Express REST API starter',
        files: [
            { name: 'index.js', content: `const express = require('express');\nconst app = express();\n\napp.use(express.json());\n\napp.get('/', (req, res) => res.json({ message: 'Hello World' }));\n\napp.listen(3000, () => console.log('Server on port 3000'));` },
            { name: 'package.json', content: `{\n  "name": "node-api",\n  "version": "1.0.0",\n  "main": "index.js",\n  "dependencies": { "express": "^4.18.0" }\n}` }
        ]
    },
    {
        id: 'nextjs', name: 'Next.js', icon: Globe, color: 'from-slate-800 to-gray-700',
        description: 'Full-stack Next.js app',
        files: [
            { name: 'page.tsx', content: `export default function Home() {\n  return <main><h1>Hello Next.js</h1></main>;\n}` },
            { name: 'layout.tsx', content: `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html><body>{children}</body></html>;\n}` }
        ]
    },
    {
        id: 'python', name: 'Python', icon: Terminal, color: 'from-yellow-600 to-amber-500',
        description: 'Python script starter',
        files: [
            { name: 'main.py', content: `def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))` },
            { name: 'requirements.txt', content: '# Add your dependencies here\n' }
        ]
    },
    {
        id: 'html', name: 'HTML/CSS', icon: FileCode, color: 'from-orange-600 to-red-500',
        description: 'Simple HTML + CSS page',
        files: [
            { name: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>` },
            { name: 'style.css', content: `body {\n  font-family: sans-serif;\n  background: #f0f0f0;\n  display: flex;\n  justify-content: center;\n  padding: 2rem;\n}` }
        ]
    },
];

interface Friend {
    id: string;
    friend_id: string;
    profile: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string;
        email?: string;
    };
}

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }: { isOpen: boolean; onClose: () => void; onRoomCreated: () => void }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);

    // Form State
    const [roomName, setRoomName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [externalEmails, setExternalEmails] = useState<string>('');

    // Data State
    const [friends, setFriends] = useState<Friend[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchFriends();
            setStep(1);
            setRoomName('');
            setSelectedFriends([]);
            setExternalEmails('');
            setSelectedTemplate(TEMPLATES[0]);
        }
    }, [isOpen, user]);

    async function fetchFriends() {
        try {
            // Fetch accepted friendships
            const { data, error } = await supabase
                .from('friendships')
                .select('id, friend_id, user_id, status')
                .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
                .eq('status', 'accepted');

            if (error) throw error;

            const enriched = await Promise.all((data || []).map(async (f: any) => {
                const targetId = f.user_id === user!.id ? f.friend_id : f.user_id;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url, email')
                    .eq('id', targetId)
                    .single();
                return {
                    id: f.id,
                    friend_id: targetId,
                    profile: profile || { id: targetId, username: 'Unknown', full_name: '', avatar_url: '' }
                };
            }));
            setFriends(enriched);
        } catch (error) {
            console.error("Error fetching friends for modal:", error);
        }
    }

    async function handleCreate() {
        if (!roomName.trim()) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Create Room
            const slug = roomName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
            // Store template selection in room metadata
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .insert({
                    name: roomName,
                    slug,
                    created_by: user!.id,
                    template: selectedTemplate.id
                })
                .select()
                .single();

            if (roomError) throw roomError;

            // Store template files in localStorage so RoomWorkspace can seed them
            localStorage.setItem(`room-template-${room.id}`, JSON.stringify(selectedTemplate.files));

            // 2. Add Creator
            const membersToAdd = [
                { room_id: room.id, user_id: user!.id, role: 'admin' }
            ];

            // 3. Add Selected Friends
            selectedFriends.forEach(friendId => {
                membersToAdd.push({ room_id: room.id, user_id: friendId, role: 'member' }); // Default to member (editor)
            });

            // 4. Handle External Emails (Try to find them)
            if (externalEmails.trim()) {
                const emails = externalEmails.split(',').map(e => e.trim()).filter(e => e);
                for (const email of emails) {
                    const { data: foundUser } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (foundUser) {
                        // Avoid duplicates
                        if (!membersToAdd.find(m => m.user_id === foundUser.id)) {
                            membersToAdd.push({ room_id: room.id, user_id: foundUser.id, role: 'member' });
                        }
                    }
                }
            }

            // Batch Insert Members
            const { error: memberError } = await supabase
                .from('room_members')
                .insert(membersToAdd);

            if (memberError) {
                console.error("Error adding members:", memberError);
                // Non-fatal, room created.
            }

            onRoomCreated();
            onClose();
            navigate(`/room/${room.id}`);

        } catch (err: any) {
            console.error("Error creating room:", err);
            setError(err.message || "Failed to create workspace. Check if the database table exists.");
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    // Step labels for breadcrumb
    const steps = ['Template', 'Name', 'Invite'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h2 className="text-xl font-black">Create Workspace</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 mb-6">
                        {steps.map((label, i) => (
                            <div key={label} className="flex items-center gap-2">
                                <button
                                    onClick={() => i + 1 < step && setStep(i + 1)}
                                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${step === i + 1 ? 'text-indigo-400' : step > i + 1 ? 'text-white/60 hover:text-white cursor-pointer' : 'text-white/20'
                                        }`}
                                >
                                    {label}
                                </button>
                                {i < 2 && <span className="text-white/10 text-xs">›</span>}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Template */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-white/40 text-sm">Choose a starter template for your workspace.</p>
                            <div className="grid grid-cols-3 gap-2">
                                {TEMPLATES.map(t => {
                                    const Icon = t.icon;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTemplate(t)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center ${selectedTemplate.id === t.id
                                                ? 'border-indigo-500/60 bg-indigo-500/10'
                                                : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                                                }`}
                                        >
                                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center`}>
                                                <Icon size={16} className="text-white" />
                                            </div>
                                            <span className="text-xs font-bold text-white/80">{t.name}</span>
                                            <span className="text-[10px] text-white/30 leading-tight">{t.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                            >
                                Continue with {selectedTemplate.name} <ArrowRightIcon />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Name */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Workspace Name</label>
                                <div className="relative">
                                    <Layout size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        placeholder="e.g. Project Phoenix"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-lg font-bold focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                                        onKeyDown={(e) => e.key === 'Enter' && roomName.trim() && setStep(3)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                disabled={!roomName.trim()}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600"
                            >
                                Next: Add Collaborators <ArrowRightIcon />
                            </button>
                        </div>
                    )}

                    {/* Step 3: Invite */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs animate-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}
                            <div>
                                <h3 className="text-lg font-bold mb-1">Invite your team</h3>
                                <p className="text-white/40 text-sm mb-4">Add members now to start collaborating instantly.</p>

                                {/* Friend Selector */}
                                <div className="space-y-2 mb-4">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Select from Connections</label>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl bg-white/5 p-2 space-y-1">
                                        {friends.length === 0 ? (
                                            <p className="text-center text-white/20 text-xs py-4">No connections found. You can add by email below.</p>
                                        ) : (
                                            friends.map(friend => (
                                                <div
                                                    key={friend.friend_id}
                                                    onClick={() => {
                                                        if (selectedFriends.includes(friend.friend_id)) {
                                                            setSelectedFriends(selectedFriends.filter(id => id !== friend.friend_id));
                                                        } else {
                                                            setSelectedFriends([...selectedFriends, friend.friend_id]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedFriends.includes(friend.friend_id) ? 'bg-indigo-600/20 border border-indigo-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                                                >
                                                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${selectedFriends.includes(friend.friend_id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                        {selectedFriends.includes(friend.friend_id) && <Check size={10} />}
                                                    </div>
                                                    <img src={friend.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.profile.id}`} className="h-6 w-6 rounded-full bg-black" />
                                                    <span className="text-sm font-medium">{friend.profile.username}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Invite valid emails (comma separated)</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-4 top-4 text-white/20" />
                                        <textarea
                                            value={externalEmails}
                                            onChange={(e) => setExternalEmails(e.target.value)}
                                            placeholder="alice@example.com, bob@example.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-sm focus:outline-none focus:border-indigo-500/50 transition-all h-24 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                        <>Create & Invite <Plus size={18} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ArrowRightIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
    )
}
