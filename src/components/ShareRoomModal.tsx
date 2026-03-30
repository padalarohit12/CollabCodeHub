import { useState } from 'react';
import {
    X,
    Copy,
    Check,
    MessageCircle,
    Mail
} from 'lucide-react';

interface ShareRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string; // Used to generate link
}

export default function ShareRoomModal({ isOpen, onClose, roomId }: ShareRoomModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const roomUrl = `${window.location.origin}/room/${roomId}`;
    const shareText = `Join my workspace on CollabCodeHub: ${roomUrl}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(roomUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleEmail = () => {
        window.open(`mailto:?subject=Join my Workspace&body=${encodeURIComponent(shareText)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 apple-glass-heavy">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-black">Share Workspace</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Copy Link Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">Workspace Link</label>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={roomUrl}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/70 focus:outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center justify-center text-white"
                            >
                                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Quick Share Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleWhatsApp}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/20 group"
                        >
                            <MessageCircle size={24} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-[#25D366]">WhatsApp</span>
                        </button>

                        <button
                            onClick={handleEmail}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20 group"
                        >
                            <Mail size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-blue-400">Email</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
