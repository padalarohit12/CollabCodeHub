import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { LiveblocksYjsProvider as YProvider } from "@liveblocks/yjs";
import { useRoom, useSelf, useStorage, useOthers, useBroadcastEvent } from "../liveblocks.config";
import Editor, { OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { Sparkles, FileCode, Github, Check, Loader2, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { getTabCompletion, detectLanguage } from "../lib/tabCompletion";

export function CollaborativeEditor() {
    const room = useRoom();
    const self = useSelf();
    const others = useOthers();
    const files = useStorage((root) => root.files);
    const activeFileId = self?.presence.activeFileId;

    const [editor, setEditor] = useState<any>(null);
    const [isCommitting, setIsCommitting] = useState(false);
    const [commitSuccess, setCommitSuccess] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [lastCompletion, setLastCompletion] = useState<string | null>(null);
    const broadcastActivity = useBroadcastEvent();
    const providerRef = useRef<YProvider | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const docRef = useRef<Y.Doc | null>(null);
    const tabHandlerRef = useRef<any>(null);

    const handleCommit = async () => {
        setIsCommitting(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsCommitting(false);
        setCommitSuccess(true);
        const fileName = files?.get(activeFileId || "")?.name || "file";
        broadcastActivity({
            type: 'file_updated',
            fileName: fileName,
            userName: self?.info?.name || "User"
        });
        setTimeout(() => setCommitSuccess(false), 3000);
    };

    const handleTabCompletion = async (editorInstance: any) => {
        const model = editorInstance.getModel();
        const position = editorInstance.getPosition();
        if (!model || !position) return;

        const currentLine = model.getLineContent(position.lineNumber);
        const trimmed = currentLine.trimEnd();

        // Only trigger if cursor is at the end of a non-trivial line
        if (!trimmed || trimmed.length < 3 || position.column <= trimmed.length) {
            // Fallback: insert normal tab
            editorInstance.trigger('keyboard', 'tab', {});
            return;
        }

        // Get context: up to 20 lines before cursor
        const startLine = Math.max(1, position.lineNumber - 20);
        const contextLines: string[] = [];
        for (let i = startLine; i <= position.lineNumber; i++) {
            contextLines.push(model.getLineContent(i));
        }
        const codeContext = contextLines.join('\n');

        const apiKey = import.meta.env.VITE_HF_TOKEN;
        // Get file name from storage (avoids stale closure on activeFile)
        const fileName = files?.get(activeFileId || '')?.name || '';
        const lang = detectLanguage(fileName);

        setIsCompleting(true);
        setLastCompletion(null);
        try {
            const completion = await getTabCompletion(codeContext, trimmed, lang, apiKey);
            if (completion) {
                // Insert completion at current cursor position
                const endOfLine = model.getLineMaxColumn(position.lineNumber);
                editorInstance.executeEdits('ai-complete', [{
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: endOfLine,
                        endLineNumber: position.lineNumber,
                        endColumn: endOfLine
                    },
                    text: completion
                }]);
                // Move cursor to end of inserted text
                const newCol = endOfLine + completion.length;
                editorInstance.setPosition({ lineNumber: position.lineNumber, column: newCol });
                setLastCompletion(completion);
                setTimeout(() => setLastCompletion(null), 3000);
            } else {
                editorInstance.trigger('keyboard', 'tab', {});
            }
        } catch {
            editorInstance.trigger('keyboard', 'tab', {});
        } finally {
            setIsCompleting(false);
        }
    };

    const handleEditorDidMount: OnMount = (editorInstance) => {
        setEditor(editorInstance);

        // Register Tab key for AI completion
        if (tabHandlerRef.current) tabHandlerRef.current.dispose();
        tabHandlerRef.current = editorInstance.addCommand(
            // Monaco.KeyCode.Tab = 2
            2, // Tab key
            () => handleTabCompletion(editorInstance),
            '' // No condition — always intercept Tab
        );
    };

    useEffect(() => {
        if (!editor || !room) return;

        // Cleanup previous binding if any
        if (bindingRef.current) bindingRef.current.destroy();
        if (providerRef.current) providerRef.current.destroy();

        const yDoc = new Y.Doc();
        const yText = yDoc.getText("monaco");
        const provider = new YProvider(room as any, yDoc);

        // If we have an active file, we should arguably use a sub-doc or a specific type per file.
        // For the "Workspace OS" MVP, we'll use a unique text type per file ID in the same room.
        const fileContent = activeFileId ? yDoc.getText(activeFileId) : yText;

        const binding = new MonacoBinding(
            fileContent,
            editor.getModel(),
            new Set([editor]),
            provider.awareness as any
        );

        providerRef.current = provider;
        bindingRef.current = binding;
        docRef.current = yDoc;

        return () => {
            binding.destroy();
            provider.destroy();
        };
    }, [editor, room, activeFileId]);

    if (!activeFileId) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-black/40 p-12 text-center">
                <div className="p-8 apple-glass rounded-[3rem] border-white/5 shadow-2xl max-w-md animate-apple-fade-in">
                    <div className="h-20 w-20 bg-indigo-600/20 rounded-3xl mx-auto flex items-center justify-center mb-8 border border-indigo-500/20">
                        <FileCode size={40} className="text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-4 tracking-tighter">Choose a File to Begin</h2>
                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                        Select an existing file from the explorer on the left, or create a new one to start your collaborative session.
                    </p>
                    <div className="mt-8 px-6 py-3 apple-glass border-white/5 rounded-2xl flex items-center justify-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-widest">
                        <Sparkles size={14} className="text-indigo-400/50" />
                        Workspace Ready
                    </div>
                </div>
            </div>
        );
    }

    const activeFile = files?.get(activeFileId ?? '');
    // Collaborators viewing the same file
    const sameFileCollaborators = others.filter(o => o.presence.activeFileId === activeFileId);

    return (
        <div className="h-full w-full flex flex-col relative group">
            <div className="absolute top-4 right-8 z-50 flex items-center gap-3 animate-apple-fade-in">
                <div className="flex items-center gap-2 apple-glass px-4 py-2 rounded-xl border-white/10 shadow-2xl">
                    {/* Live collaborator avatars on same file */}
                    {sameFileCollaborators.length > 0 && (
                        <div className="flex -space-x-2 mr-1">
                            {sameFileCollaborators.slice(0, 4).map((other) => (
                                <div key={other.connectionId} className="relative group/avatar">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${other.id}`}
                                        alt="Collaborator"
                                        className="h-5 w-5 rounded-full border-2 border-indigo-500 bg-slate-800 block"
                                    />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/90 text-white text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none border border-white/10">
                                        {other.info?.name || `User ${String(other.connectionId).slice(-3)}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        {isCompleting ? (
                            <>
                                <Loader2 size={10} className="animate-spin text-indigo-400" />
                                <span className="text-[10px] font-bold text-indigo-400 tracking-wider">AI thinking...</span>
                            </>
                        ) : lastCompletion ? (
                            <>
                                <Zap size={10} className="text-green-400" />
                                <span className="text-[10px] font-bold text-green-400 tracking-wider">AI completed!</span>
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-white/60 tracking-wider">
                                    {activeFile?.name || 'Untitled'} • {sameFileCollaborators.length > 0 ? `${sameFileCollaborators.length + 1} editing live` : 'Tab → AI Complete'}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleCommit}
                    disabled={isCommitting || commitSuccess}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border transition-apple font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-500/10",
                        commitSuccess
                            ? "bg-green-500/20 border-green-500/30 text-green-400"
                            : "apple-glass border-white/10 text-white/40 hover:text-white hover:bg-white/5 active:scale-95"
                    )}
                >
                    {isCommitting ? (
                        <Loader2 size={14} className="animate-spin text-indigo-400" />
                    ) : commitSuccess ? (
                        <Check size={14} className="text-green-400" />
                    ) : (
                        <Github size={14} />
                    )}
                    {isCommitting ? "Pushing..." : commitSuccess ? "Committed" : "Commit to GitHub"}
                </button>
            </div>

            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    cursorSmoothCaretAnimation: "on" as any,
                    smoothScrolling: true,
                    roundedSelection: true,
                    padding: { top: 24, bottom: 24 },
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                }}
            />
        </div>
    );
}
