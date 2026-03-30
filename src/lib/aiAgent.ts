// AI Agent utility — powered by Qwen2.5-7B-Instruct via HuggingFace Router

const HF_BASE_URL = 'https://router.huggingface.co/v1';
const QWEN_MODEL = 'Qwen/Qwen2.5-7B-Instruct:together';

export interface AgentFileOp {
    action: 'create' | 'update' | 'delete';
    name: string;
    content?: string;
}

export interface AgentResponse {
    message: string;       // What the agent says in chat
    files: AgentFileOp[];  // File operations to apply
}

function buildSystemPrompt(workspaceContext: any): string {
    const fileList = workspaceContext?.fileTree?.length
        ? workspaceContext.fileTree.map((f: any) => `- ${f.name} (${f.lines} lines)`).join('\n')
        : '(no files yet)';

    const fileContents = workspaceContext?.contextString || '(empty workspace)';

    return `You are an AI coding agent embedded in CollabCodeHub, a real-time collaborative coding platform.

You can READ and WRITE files in the user's workspace. When the user asks you to write or create code, you MUST include file operations in your response.

Current workspace files:
${fileList}

Full file contents:
${fileContents}

ALWAYS respond with a valid JSON object in exactly this format (no markdown, no code blocks, just raw JSON):
{
  "message": "A short friendly message describing what you did or answering the question",
  "files": [
    {
      "action": "create",
      "name": "filename.tsx",
      "content": "full file content here"
    }
  ]
}

Rules:
- For "update": rewrite the ENTIRE file content with changes applied
- For "create": provide complete, working code (not snippets)
- For "delete": only provide name, no content needed
- If the user is just asking a question (no code needed), return files: []
- Always use TypeScript/TSX for React components
- Write clean, production-quality code with proper imports
- File names should be descriptive (e.g. LoginForm.tsx, not component.tsx)`;
}

export async function runAIAgent(
    command: string,
    workspaceContext: any,
    apiKey: string
): Promise<AgentResponse> {
    if (!apiKey) {
        return {
            message: '⚠️ No HuggingFace token configured. Add VITE_HF_TOKEN to your .env file to enable the AI agent.',
            files: []
        };
    }

    const systemPrompt = buildSystemPrompt(workspaceContext);

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
                { role: 'user', content: command }
            ],
            max_tokens: 4096,
            temperature: 0.3,
            stream: false
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`HuggingFace API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const rawText: string = data.choices?.[0]?.message?.content || '';

    // Parse JSON from the response (strip any surrounding text/markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        // Fallback: treat entire response as a message, no file ops
        return { message: rawText, files: [] };
    }

    try {
        const parsed: AgentResponse = JSON.parse(jsonMatch[0]);
        return {
            message: parsed.message || 'Done.',
            files: Array.isArray(parsed.files) ? parsed.files : []
        };
    } catch {
        return { message: rawText, files: [] };
    }
}
