import { Play, RotateCcw, Monitor, ExternalLink, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useStorage } from '../liveblocks.config';

export function LivePreview() {
    const files = useStorage((root) => root.files);
    const [srcDoc, setSrcDoc] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    const bundledCode = useMemo(() => {
        if (!files) return null;

        const fileArray = Array.from(files.entries());

        // Find HTML, CSS, and JS files
        let htmlContent = '';
        let cssContent = '';
        let jsContent = '';

        fileArray.forEach(([_, file]) => {
            const name = file.name.toLowerCase();

            if (name.endsWith('.html')) {
                htmlContent = file.content;
            } else if (name.endsWith('.css')) {
                cssContent += file.content + '\n';
            } else if (name.endsWith('.js')) {
                jsContent += file.content + '\n';
            }
        });

        // If no HTML file, create a default structure
        if (!htmlContent) {
            htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Live Preview</title>
                </head>
                <body>
                    <div id="root"></div>
                </body>
                </html>
            `;
        }

        // Inject CSS and JS into HTML
        let finalDoc = htmlContent;

        if (cssContent) {
            const styleTag = `<style>${cssContent}</style>`;
            if (finalDoc.includes('</head>')) {
                finalDoc = finalDoc.replace('</head>', `${styleTag}</head>`);
            } else {
                finalDoc = styleTag + finalDoc;
            }
        }

        if (jsContent) {
            const scriptTag = `
                <script>
                    try {
                        ${jsContent}
                    } catch (err) {
                        console.error('Runtime Error:', err);
                        document.body.innerHTML += '<div style="position: fixed; bottom: 20px; left: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 12px 16px; border-radius: 12px; font-family: monospace; font-size: 11px; max-width: 400px; backdrop-filter: blur(10px);"><strong>Error:</strong> ' + err.toString() + '</div>';
                    }
                </script>
            `;
            if (finalDoc.includes('</body>')) {
                finalDoc = finalDoc.replace('</body>', `${scriptTag}</body>`);
            } else {
                finalDoc = finalDoc + scriptTag;
            }
        }

        return finalDoc;
    }, [files]);

    useEffect(() => {
        if (autoRefresh && bundledCode) {
            const timeout = setTimeout(() => setSrcDoc(bundledCode), 500);
            return () => clearTimeout(timeout);
        }
    }, [bundledCode, autoRefresh]);

    const manualRefresh = () => {
        if (bundledCode) setSrcDoc(bundledCode);
    };

    const fileCount = files ? Array.from(files.entries()).length : 0;

    return (
        <div className="h-full flex flex-col bg-black/40 border-l border-white/5">
            <header className="h-12 flex items-center justify-between px-6 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-white/40" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Live Preview</span>
                    <div className="h-3 w-px bg-white/10 mx-2" />
                    <span className="text-[9px] font-bold text-white/20">{fileCount} files</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-apple text-[9px] font-bold uppercase tracking-widest ${autoRefresh
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                : 'text-white/20 hover:text-white/40'
                            }`}
                    >
                        <Zap size={10} />
                        Auto
                    </button>
                    <button onClick={manualRefresh} className="p-2 transition-apple text-white/20 hover:text-indigo-400">
                        <RotateCcw size={16} />
                    </button>
                    <button className="p-2 transition-apple text-white/20 hover:text-white">
                        <ExternalLink size={16} />
                    </button>
                </div>
            </header>

            <div className="flex-1 bg-white p-0 relative">
                <iframe
                    srcDoc={srcDoc}
                    title="preview"
                    sandbox="allow-scripts"
                    className="w-full h-full border-none bg-white"
                />

                {/* Custom Overlay for Preview */}
                <div className="absolute top-4 right-4 apple-glass px-4 py-2 rounded-xl border-white/10 pointer-events-none opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Sandbox Active</span>
                    </div>
                </div>
            </div>

            <footer className="p-4 bg-white/[0.01] flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 apple-glass rounded-lg border-white/5">
                    <Play size={10} className="text-green-400" />
                    <span className="text-[10px] font-bold text-white/40 italic">
                        {autoRefresh ? 'Auto-runtime enabled' : 'Manual mode'}
                    </span>
                </div>
            </footer>
        </div>
    );
}
