import { useState } from 'react';
import {
    FileText,
    Folder,
    Plus,
    FileCode,
    Trash2,
    Edit2,
    Github,
    Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStorage, useMutation, useSelf, useUpdateMyPresence, useBroadcastEvent } from '../liveblocks.config';
import { LiveObject } from '@liveblocks/client';

export function FileExplorer() {
    const files = useStorage((root) => root.files);
    const self = useSelf();
    const updateMyPresence = useUpdateMyPresence();
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [importingState, setImportingState] = useState<'idle' | 'fetching' | 'error'>('idle');

    const broadcastActivity = useBroadcastEvent();
    const createFile = useMutation(({ storage }, name: string) => {
        const id = Math.random().toString(36).substring(7);
        storage.get("files").set(id, new LiveObject({
            name,
            content: `// Start coding in ${name}...`,
            type: "file"
        }));
        setIsCreating(false);
        setNewItemName('');
        updateMyPresence({ activeFileId: id });
        broadcastActivity({ type: 'file_created', fileName: name, userName: self?.info?.name || 'User' });
    }, [updateMyPresence, broadcastActivity, self?.info?.name]);

    const importFromGithub = useMutation(async ({ storage }, url: string) => {
        try {
            setImportingState('fetching');

            // Basic URL parsing: https://github.com/owner/repo
            const parts = url.replace('https://github.com/', '').split('/');
            if (parts.length < 2) throw new Error("Invalid GitHub URL");

            const [owner, repo] = parts;

            const response = await fetch('/api/github/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo })
            });

            if (!response.ok) throw new Error("Failed to fetch repo");

            const contents = await response.json();
            const filesMap = storage.get("files");

            // Import top-level files
            for (const item of contents) {
                if (item.type === 'file') {
                    const id = Math.random().toString(36).substring(7);

                    // Fetch actual content
                    const contentResponse = await fetch(item.download_url);
                    const content = await contentResponse.text();

                    filesMap.set(id, new LiveObject({
                        name: item.name,
                        content: content,
                        type: "file"
                    }));
                }
            }

            setIsImporting(false);
            setGithubUrl('');
            setImportingState('idle');
        } catch (err) {
            console.error("GitHub Import Error:", err);
            setImportingState('error');
        }
    }, [setIsImporting, setGithubUrl, setImportingState]);

    const deleteFile = useMutation(({ storage }, id: string) => {
        const file = storage.get("files").get(id);
        const fileName = file?.get("name") || "unknown";
        storage.get("files").delete(id);
        if (self?.presence.activeFileId === id) {
            updateMyPresence({ activeFileId: null });
        }
        broadcastActivity({ type: 'file_updated', fileName: `Deleted: ${fileName}`, userName: self?.info?.name || 'User' });
    }, [self?.presence.activeFileId, updateMyPresence, broadcastActivity, self?.info?.name]);

    if (!files) return (
        <div className="w-64 apple-glass border-r border-white/5 p-6 space-y-4">
            <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
        </div>
    );

    return (
        <div className="w-64 h-full flex flex-col border-r border-white/5 bg-black/10 transition-apple">
            <div className="p-6 flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30">Files</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setIsImporting(!isImporting); setIsCreating(false); }}
                        className={cn(
                            "p-1.5 rounded-lg transition-apple",
                            isImporting ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-white/40 hover:text-white"
                        )}
                        title="Import from GitHub"
                    >
                        <Github size={16} />
                    </button>
                    <button
                        onClick={() => { setIsCreating(!isCreating); setIsImporting(false); }}
                        className={cn(
                            "p-1.5 rounded-lg transition-apple",
                            isCreating ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-white/40 hover:text-indigo-400"
                        )}
                        title="New File"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                {isCreating && (
                    <div className="flex items-center gap-2 px-3 py-2 apple-glass rounded-xl border-indigo-500/30 mb-2">
                        <FileCode size={14} className="text-indigo-400" />
                        <input
                            autoFocus
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newItemName) createFile(newItemName);
                                if (e.key === 'Escape') setIsCreating(false);
                            }}
                            placeholder="filename..."
                            className="bg-transparent border-none outline-none text-xs text-white/90 placeholder:text-white/20 w-full"
                        />
                    </div>
                )}

                {isImporting && (
                    <div className="flex flex-col gap-2 px-3 py-3 apple-glass rounded-xl border-indigo-500/30 mb-4 bg-indigo-500/5">
                        <div className="flex items-center gap-2">
                            <Github size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Import Repository</span>
                        </div>
                        <input
                            autoFocus
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && githubUrl) importFromGithub(githubUrl);
                                if (e.key === 'Escape') setIsImporting(false);
                            }}
                            placeholder="https://github.com/owner/repo"
                            className="bg-transparent border-none outline-none text-[11px] text-white/90 placeholder:text-white/20 w-full"
                        />
                        {importingState === 'fetching' && (
                            <div className="flex items-center gap-2 mt-1">
                                <Loader2 size={10} className="animate-spin text-indigo-400" />
                                <span className="text-[9px] font-bold text-indigo-400 uppercase">Hydrating Workspace...</span>
                            </div>
                        )}
                        {importingState === 'error' && (
                            <p className="text-[9px] font-bold text-red-400 uppercase mt-1">Failed to import repo.</p>
                        )}
                    </div>
                )}

                {Array.from(files.entries()).map(([id, file]) => {
                    const isActive = self?.presence.activeFileId === id;
                    return (
                        <div
                            key={id}
                            onClick={() => updateMyPresence({ activeFileId: id })}
                            className={cn(
                                "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-apple",
                                isActive
                                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10"
                                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {file.type === "folder" ? (
                                    <Folder size={16} className={isActive ? "text-indigo-400" : "text-white/20"} />
                                ) : (
                                    <FileText size={16} className={isActive ? "text-indigo-400" : "text-white/20"} />
                                )}
                                <span className="text-xs font-semibold truncate max-w-[120px]">{file.name}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-apple">
                                <button className="p-1 hover:text-white transition-apple">
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteFile(id); }}
                                    className="p-1 hover:text-red-400 transition-apple"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {files.size === 0 && !isCreating && (
                    <div className="py-8 text-center px-4">
                        <FileCode size={32} className="mx-auto text-white/5 mb-3" />
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">No files created yet</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white/[0.01] border-t border-white/5">
                <div className="flex items-center gap-3 px-3 py-2 apple-glass rounded-xl border-white/5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                    Explorer Active
                </div>
            </div>
        </div>
    );
}
