# 🚀 CollabCodeHub — Complete Project Documentation

CollabCodeHub is a unified, real-time collaborative coding environment built for modern remote teams. It brings together code editing, task management, whiteboarding, AI assistance, and terminal access into a single, seamless workspace.

---

## 1. Executive Summary

### 🌟 Vision Statement
To replace the fragmented modern developer toolchain (VS Code + Jira + Miro + Slack + ChatGPT) with a single, collaborative, real-time workspace where teams can brainstorm, code, and ship software seamlessly together.

### 👥 Target Audience
- **Remote Development Teams:** Software engineering teams distributed across regions needing synchronous collaboration.
- **Freelancers & Agencies:** Teams working dynamically with clients requiring transparent project visibility.
- **Bootcamp Students & Educators:** Instructors and learners who need pair-programming environments without complicated environment setups.

### 🎯 Core Needs Addressed
- **Context Switching Penalty:** Developers lose focus switching between Jira, GitHub, Slack, and VS Code. CollabCodeHub centralizes these.
- **Pair Programming Friction:** "My environment acts differently than yours." Shared, browser-based environments eliminate the "It works on my machine" problem.
- **AI Tool Sprawl:** Keeping a separate tab open for ChatGPT ruins flow. AI is integrated directly into the workspace (AIPulse & inline autocomplete).

### 💎 Value Proposition & Products
We deliver a **"Multiplayer Workspace OS"**.
- **The Engine:** Real-time sync engine powered by Liveblocks (CRDTs) and Supabase (WebSockets).
- **The Tools:** Monaco-based Collaborative Editor, draggable Kanban Board, Infinite Canvas Whiteboard, and a shared Express-powered Terminal.
- **The Intelligence:** Qwen2.5/Gemini AI agents embedded into the chat and editor contexts to write, refactor, and review code collaboratively.

---

## 2. Product Roadmap

### ✅ Phase 1: Core Collaboration (Current State)
- Real-time code editor with live cursors and presence indicators.
- Live Kanban task board with drag-and-drop.
- Real-time chat module with DiceBear avatars.
- Collaborative Whiteboard canvas for architecture planning.
- Shared terminal execution environment.
- Room Templates for fast project scaffolding (React, Node, Python, etc.).

### 🤖 Phase 2: AI & Intelligence Upgrade (In Progress)
- **AI Tab Autocomplete:** Inline code completion powered by HuggingFace/Qwen models.
- **AI Meeting Notes:** Post-huddle auto-summarization and task generation.
- **Dashboard Insights:** AI-driven project wellness checks on the main dashboard.

### 💰 Phase 3: SaaS Monetization Layer
- Implement Free / Pro / Team pricing tiers.
- Stripe checkout integration.
- Hardware/Compute limits scaling (Free = 1GB storage, Pro = Unlimited).

### 📈 Phase 4: Scale, Growth & Retention
- One-Click Deployments (Vercel integration).
- GitHub Repo ↔ Workspace bi-directional sync.
- Embeddable read-only workspaces for documentation and blogs.

---

## 3. System Architecture

The application relies on a modern serverless/edge stack mixed with a dedicated WebSocket server for terminal access.

```mermaid
graph TD
    Client["Browser (React / Vite)"]

    subgraph "Backend Services"
        Supa["Supabase"]
        Live["Liveblocks"]
        Exp["Express Node Server"]
    end

    Client -- "REST / JWT" --> Supa
    Client -- "WebSocket (Realtime DB)" --> Supa
    Client -- "Auth Token Request" --> Exp
    Exp -- "Validate Session" --> Supa
    Exp -- "Issue Token" --> Live
    Client -- "WebSocket (Yjs/Presence)" --> Live
    Client -- "WebSocket (xterm.js)" --> Exp
    
    note_supa["PostgreSQL\nAuth\nPub/Sub Tasks & Chat"] -.-> Supa
    note_live["CRDTs (Yjs)\nLiveCursors\nShared Maps"] -.-> Live
    note_exp["Pty.js Shell\nLiveblocks Auth Hook"] -.-> Exp
```

---

## 4. Database Schema (Supabase)

Below is the Entity-Relationship (ER) diagram representing our PostgreSQL schema.

```mermaid
erDiagram
    profiles ||--o{ rooms : "created"
    profiles ||--o{ room_members : "belongs to"
    profiles ||--o{ friendships : "sends/receives"
    rooms ||--o{ room_members : "contains"
    rooms ||--o{ messages : "has"
    rooms ||--o{ tasks : "has"

    profiles {
        uuid id PK
        string full_name
        string avatar_url
        string email
        timestamp created_at
    }

    rooms {
        uuid id PK
        string name
        string slug
        uuid created_by FK
        jsonb settings
        timestamp created_at
    }

    room_members {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        string role "admin/member"
        timestamp joined_at
    }

    messages {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        string content
        timestamp created_at
    }

    tasks {
        uuid id PK
        uuid room_id FK
        string title
        string description
        string status "todo/in-progress/done/archived"
        string priority "low/medium/high/urgent"
        int position
        uuid assigned_to FK
        timestamp created_at
    }

    friendships {
        uuid id PK
        uuid user_id FK
        uuid friend_id FK
        string status "pending/accepted"
        timestamp created_at
    }
```

### Security
Authentication is handled via Supabase Auth. We utilize strict **Row Level Security (RLS)** in PostgreSQL. Access to `rooms`, `tasks`, and `messages` is restricted by a custom PL/pgSQL function `is_room_member()` which verifies the user exists in `room_members` for the queried `room_id`.

---

## 5. Core User Flows

### Flow 1: Room Creation & Workspace Seeding

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Supabase DB
    participant Liveblocks
    
    User->>Frontend: Clicks "New Workspace"
    Frontend->>User: Shows Template Selection (React, Node, etc.)
    User->>Frontend: Selects Template & Names Room
    Frontend->>Supabase DB: INSERT INTO rooms (name)
    Supabase DB-->>Frontend: Returns roomId
    Frontend->>Supabase DB: INSERT INTO room_members (roomId, userId)
    Frontend->>Frontend: Save template files to localStorage
    Frontend->>Frontend: Navigate to /room/:roomId
    Frontend->>Liveblocks: Connect to room
    Frontend->>Liveblocks: Run useMutation() to seed files to LiveMap Storage
    Liveblocks-->>Frontend: Workspace Hydrated
    Frontend->>User: Renders Collaborative Editor
```

### Flow 2: AI Assistance via Chat / Terminal

```mermaid
sequenceDiagram
    actor User
    participant ChatModule
    participant AI Agent Layer
    participant HuggingFace API
    participant Liveblocks Storage
    
    User->>ChatModule: Types "/ai Create a new React Button"
    ChatModule->>AI Agent Layer: Extract prompt & gather Context (File Tree, Active Code)
    AI Agent Layer->>HuggingFace API: POST /chat/completions (Qwen2.5)
    HuggingFace API-->>AI Agent Layer: Response with generated code
    AI Agent Layer->>Liveblocks Storage: mutation: Apply file updates/creations
    Liveblocks Storage-->>Other Users: Sync code across active clients
    AI Agent Layer->>ChatModule: Insert summary message
    ChatModule->>User: Displays "AI Agent: Created Button.tsx"
```

---

## 6. Detailed Feature Breakdown

1. **Dashboard:** Central hub showing active workspaces, global activity feed, and friend management.
2. **Apple-glass Dock:** Left-side navigation bar inside the room for seamlessly switching between the Editor, Task Board, Whiteboard, and Chat without leaving the context.
3. **Activity Feed Panel:** A real-time log capturing "who did what" globally within the workspace (file changes, task updates, members joining).
4. **Code Runner / Terminal:** A shared console where users can execute browser-native Javascript code sandboxes or communicate with the backend proxy process.
5. **AI Pulse:** A floating, context-aware AI assistant (`Ctrl+I`) that can read the current file tree and answer architectural questions.
6. **Command Palette (`Ctrl+K`):** Quick-action menu to navigate the app rapidly.

---

## 7. Technology Stack Checklist

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, React Router DOM.
- **State & Collaboration:** Liveblocks, Yjs (for CRDT text synchronization).
- **Code Editor:** Monaco Editor (`@monaco-editor/react`).
- **Backend & Database:** Supabase (PostgreSQL, Auth, Realtime APIs).
- **Socket Server:** Node.js, Express, `ws` (WebSockets), `node-pty` (Terminal Integration).
- **AI Integration:** Together AI / HuggingFace Inference API (Qwen2.5/Gemini models).
- **Drag & Drop:** `@hello-pangea/dnd` (Task Board).
