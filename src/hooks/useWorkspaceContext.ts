import { useMemo } from 'react';
import { useStorage } from '../liveblocks.config';

export function useWorkspaceContext() {
    const files = useStorage((root) => root.files);

    const workspaceContext = useMemo(() => {
        if (!files) return null;

        const fileArray = Array.from(files.entries());

        // Build a structured context for AI
        const fileTree = fileArray.map(([id, file]) => ({
            id,
            name: file.name,
            type: file.type,
            content: file.content,
            lines: file.content.split('\n').length,
            size: file.content.length
        }));

        // Generate a formatted context string for AI prompts
        const contextString = fileTree.map(file => {
            return `
=== FILE: ${file.name} ===
Type: ${file.type}
Lines: ${file.lines}
Size: ${file.size} bytes

\`\`\`
${file.content}
\`\`\`
`;
        }).join('\n\n');

        return {
            fileTree,
            contextString,
            fileCount: fileTree.length,
            totalLines: fileTree.reduce((sum, f) => sum + f.lines, 0),
            totalSize: fileTree.reduce((sum, f) => sum + f.size, 0)
        };
    }, [files]);

    return workspaceContext;
}
