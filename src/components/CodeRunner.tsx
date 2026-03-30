import { useState, useRef, useEffect } from 'react';
import { Play, Square, Trash2, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStorage, useSelf } from '../liveblocks.config';

interface ConsoleEntry {
    type: 'log' | 'error' | 'warn' | 'info' | 'result';
    args: string[];
    timestamp: number;
}

export function CodeRunner() {
    const self = useSelf();
    const files = useStorage((root) => root.files);
    const activeFileId = self?.presence.activeFileId;
    const activeFile = activeFileId ? files?.get(activeFileId) : null;

    const [code, setCode] = useState('// Write JavaScript here and press Run\nconsole.log("Hello from CollabCodeHub!");\n\nconst sum = (a, b) => a + b;\nconsole.log("2 + 3 =", sum(2, 3));');
    const [output, setOutput] = useState<ConsoleEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [copied, setCopied] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    // Load active file's content when it changes
    useEffect(() => {
        if (activeFile?.content && activeFile.name?.match(/\.(js|ts|jsx|tsx)$/)) {
            setCode(activeFile.content);
        }
    }, [activeFileId]);

    // Listen for messages from the sandboxed iframe
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.source !== 'collabcodehub-runner') return;

            const { type, args } = e.data;
            setOutput(prev => [...prev, {
                type: type as ConsoleEntry['type'],
                args: args.map((a: any) => {
                    try { return typeof a === 'string' ? a : JSON.stringify(a, null, 2); }
                    catch { return String(a); }
                }),
                timestamp: Date.now()
            }]);
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }, [output]);

    const run = () => {
        setOutput([]);
        setIsRunning(true);

        // Build sandboxed execution HTML
        const html = `<!DOCTYPE html>
<html>
<head><script>
const _post = (type, args) => parent.postMessage({ source: 'collabcodehub-runner', type, args }, '*');
const _wrap = (t) => (...a) => { _post(t, a); };
console.log = _wrap('log');
console.error = _wrap('error');
console.warn = _wrap('warn');
console.info = _wrap('info');
window.onerror = (msg, src, line) => _post('error', [\`\${msg} (line \${line})\`]);
</script></head>
<body><script>
try {
${code}
} catch(e) { console.error(e.message); }
_post('result', ['✅ Execution complete']);
</script></body>
</html>`;

        if (iframeRef.current) {
            iframeRef.current.srcdoc = html;
        }

        setTimeout(() => setIsRunning(false), 1000);
    };

    const stop = () => {
        if (iframeRef.current) iframeRef.current.srcdoc = '';
        setIsRunning(false);
        setOutput(prev => [...prev, { type: 'warn', args: ['⛔ Execution stopped'], timestamp: Date.now() }]);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const entryColor = (type: ConsoleEntry['type']) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            case 'result': return 'text-green-400';
            default: return 'text-slate-300';
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border-b border-white/5">
                {activeFile && (
                    <span className="text-[10px] text-indigo-400 font-bold mr-2 uppercase tracking-wider">
                        {activeFile.name}
                    </span>
                )}
                <button
                    onClick={isRunning ? stop : run}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        isRunning
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                            : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                    )}
                >
                    {isRunning ? <Square size={12} /> : <Play size={12} />}
                    {isRunning ? 'Stop' : 'Run'}
                </button>
                <button
                    onClick={() => setOutput([])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                >
                    <Trash2 size={12} />
                    Clear
                </button>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all ml-auto"
                >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
                <span className="text-[10px] text-slate-600 font-mono">JS Sandbox</span>
            </div>

            {/* Split: editor + output */}
            <div className="flex flex-1 divide-x divide-white/5 overflow-hidden">
                {/* Code editor */}
                <textarea
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    spellCheck={false}
                    className="flex-1 bg-transparent resize-none p-3 text-xs font-mono text-slate-200 focus:outline-none custom-scrollbar leading-relaxed"
                    placeholder="// Write JavaScript..."
                />

                {/* Console output */}
                <div ref={outputRef} className="w-1/2 overflow-y-auto custom-scrollbar p-3 space-y-1 font-mono text-xs">
                    {output.length === 0 ? (
                        <p className="text-slate-700 italic">Console output appears here after Run...</p>
                    ) : (
                        output.map((entry, i) => (
                            <div key={i} className={cn("flex gap-2", entryColor(entry.type))}>
                                <span className="text-slate-700 select-none flex-shrink-0">›</span>
                                <span className="whitespace-pre-wrap break-all">{entry.args.join(' ')}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Hidden sandboxed iframe */}
            <iframe
                ref={iframeRef}
                sandbox="allow-scripts"
                style={{ display: 'none' }}
                title="code-runner"
            />
        </div>
    );
}
