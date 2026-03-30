import express from "express";
import cors from "cors";
import { Liveblocks } from "@liveblocks/node";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { WebSocketServer, WebSocket } from 'ws';
import { spawn as spawnProcess, ChildProcessWithoutNullStreams } from 'child_process';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Liveblocks Auth Server is healthy" });
});

app.post("/api/liveblocks-auth", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const { room } = req.body;

        if (!authHeader) {
            console.log("[Auth] No authorization header");
            return res.status(401).json({ message: "No authorization header" });
        }

        const token = authHeader.split(" ")[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log("[Auth] Invalid Supabase token", error);
            return res.status(401).json({ message: "Invalid session" });
        }

        console.log(`[Auth] Authenticating user: ${user.email} for room: ${room}`);

        // Create a session for the authenticated user
        const session = liveblocks.prepareSession(user.id, {
            userInfo: {
                name: user.email?.split("@")[0] || "Unknown",
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                color: "#" + Math.floor(Math.random() * 16777215).toString(16)
            },
        });

        // Grant full access to the requested room
        if (room) {
            session.allow(room, session.FULL_ACCESS);
        } else {
            // Fallback: allow all rooms (vulnerable, but useful for dev)
            // session.allow("*", session.FULL_ACCESS);
        }

        // Authorize the user and return the result
        const { status, body } = await session.authorize();

        console.log(`[Auth] Access Token issued: status=${status}`);
        return res.status(status).send(body);
    } catch (err) {
        console.error("[Auth] Error in liveblocks-auth:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post("/api/github/import", async (req, res) => {
    try {
        const { owner, repo, path: repoPath = "" } = req.body;

        if (!owner || !repo) {
            return res.status(400).json({ message: "Owner and Repo are required" });
        }

        console.log(`[GitHub] Importing ${owner}/${repo}${repoPath ? `/${repoPath}` : ""}`);

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`,
            {
                headers: {
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "CollabCodeHub-App"
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        return res.json(data);
    } catch (err) {
        console.error("[GitHub] Import Error:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Proxy Authentication Endpoints
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { email, password, metadata } = req.body;
        console.log(`[Auth] Proxy Signup for: ${email}`);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });

        if (error) {
            console.error("[Auth] Signup Error:", error.message);
            return res.status(error.status || 400).json({ error: error.message });
        }

        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[Auth] Proxy Login for: ${email}`);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("[Auth] Login Error:", error.message);
            return res.status(error.status || 400).json({ error: error.message });
        }

        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`
🚀 Liveblocks Auth Server running!
📡 URL: http://0.0.0.0:${PORT}/api/liveblocks-auth
🔌 WebSocket: ws://0.0.0.0:${PORT}
  `);
});

// Terminal Manager
const terminals = new Map<string, { process: ChildProcessWithoutNullStreams, sockets: Set<WebSocket>, history: string }>();

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');

    if (!roomId) {
        ws.close(1008, 'Room ID required');
        return;
    }

    console.log(`[Terminal] Client connected to room: ${roomId}`);

    // Get or create terminal for this room
    if (!terminals.has(roomId)) {
        console.log(`[Terminal] Spawning new shell for room: ${roomId}`);
        // Use powershell on Windows, bash on Linux/Mac
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const terminalProcess = spawnProcess(shell, [], {
            cwd: path.resolve(__dirname, '..'), // Run in project root
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe'] // Use pipes for stdin/stdout/stderr
        });

        const termSession = {
            process: terminalProcess,
            sockets: new Set<WebSocket>(),
            history: ''
        };

        terminals.set(roomId, termSession);

        // Handle terminal output
        const handleOutput = (data: Buffer) => {
            const output = data.toString();
            termSession.history += output;
            // Broadcast to all clients in room
            for (const socket of termSession.sockets) {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(output);
                }
            }
        };

        terminalProcess.stdout.on('data', handleOutput);
        terminalProcess.stderr.on('data', handleOutput);

        terminalProcess.on('exit', () => {
            console.log(`[Terminal] Process exited for room: ${roomId}`);
            terminals.delete(roomId);
            // Notify clients?
        });
    }

    const session = terminals.get(roomId)!;
    session.sockets.add(ws);

    // Send history to new client
    ws.send(session.history);

    // Handle incoming input
    ws.on('message', (message) => {
        const input = message.toString();
        // Write to shell process
        if (session.process.stdin) {
            session.process.stdin.write(input);
        }
    });

    ws.on('close', () => {
        console.log(`[Terminal] Client disconnected from room: ${roomId}`);
        session.sockets.delete(ws);

        // If no clients left, maybe kill process after timeout? 
        // For now keep it alive for persistence during session.
    });
});
