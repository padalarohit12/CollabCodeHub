// AI Tab Autocomplete for CollaborativeEditor
// Uses Qwen2.5-7B-Instruct via HuggingFace router
// Call this when user presses Tab at end of a line

const HF_BASE_URL = 'https://router.huggingface.co/v1';
const QWEN_MODEL = 'Qwen/Qwen2.5-7B-Instruct:together';

export async function getTabCompletion(
    codeContext: string,
    currentLine: string,
    language: string,
    apiKey: string
): Promise<string | null> {
    if (!apiKey) return null;

    const systemPrompt = `You are a code completion engine. Given the code context and the current incomplete line, complete ONLY the current line (not multiple lines).
Rules:
- Return ONLY the completion text that should be inserted after the cursor position
- Do NOT repeat the existing line content
- Do NOT add newlines unless completing a block opener like { or (
- Keep it short, focused, and syntactically correct
- Language: ${language}
- If nothing sensible can be completed, return empty string`;

    const userPrompt = `Code context:
\`\`\`
${codeContext}
\`\`\`

Current line (cursor at end): ${currentLine}

Complete just this line:`;

    try {
        const response = await fetch(`${HF_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: QWEN_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 120,
                temperature: 0.1,
                stop: ['\n\n', '```']
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const completion = data.choices?.[0]?.message?.content?.trim() || '';

        // Strip any code fences the model may have added
        return completion
            .replace(/^```[\w]*\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
    } catch {
        return null;
    }
}

export function detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript',
        jsx: 'JavaScript React', py: 'Python', css: 'CSS',
        html: 'HTML', json: 'JSON', md: 'Markdown', sql: 'SQL',
        rs: 'Rust', go: 'Go', java: 'Java', cpp: 'C++'
    };
    return map[ext] || 'code';
}
