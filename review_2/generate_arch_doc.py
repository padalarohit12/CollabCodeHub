import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

DIAGRAMS_DIR = r"E:\Projects\collabcodehub\review_2\review_2_docs\diagrams"
OUTPUT_DIR = r"E:\Projects\collabcodehub\review_2\review_2_docs"

def add_paragraph(doc, text, bold=False, size=11):
    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(size)
    run.bold = bold
    return p

def add_image(doc, filename, caption, width=5.5):
    # Use converted PNG files (from WebP source)
    converted = filename.replace('.png', '_converted.png')
    path = os.path.join(DIAGRAMS_DIR, converted)
    if not os.path.exists(path):
        path = os.path.join(DIAGRAMS_DIR, filename)
    if os.path.exists(path):
        doc.add_picture(path, width=Inches(width))
        last_paragraph = doc.paragraphs[-1]
        last_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = cap.add_run(caption)
        r.italic = True
        r.font.size = Pt(10)
        r.font.name = 'Calibri'
    else:
        add_paragraph(doc, f"[Image not found: {filename}]")

def create_architecture_doc():
    doc = Document()
    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(11)

    # ──── Title ────
    doc.add_paragraph('\n')
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run('Architecture Document')
    run.bold = True
    run.font.size = Pt(16)
    run.font.name = 'Calibri'
    
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = subtitle.add_run('CollabCodeHub — Real-Time Collaborative Cloud Coding Workspace')
    r2.font.size = Pt(12)
    r2.font.name = 'Calibri'
    doc.add_paragraph('\n')

    # ──── 1. Application ────
    add_paragraph(doc, '1. Application', bold=True, size=14)

    add_paragraph(doc, '1.1 Architecture Type: Event-Driven + Serverless', bold=True, size=12)
    add_paragraph(doc, "CollabCodeHub adopts a hybrid Event-Driven and Serverless architecture. The platform is fundamentally event-driven because every user interaction — a keystroke, a chat message, a task drag, or an AI invocation — triggers an asynchronous event that is propagated across the system without polling. The serverless dimension is realized through Supabase, which provides managed PostgreSQL, authentication, and real-time pub/sub without requiring the team to provision or maintain dedicated backend servers.")
    add_paragraph(doc, "This architecture was chosen over a traditional monolithic approach because CollabCodeHub must handle highly concurrent, bi-directional data streams (real-time code sync) while maintaining independent scalability of each service layer. A monolithic server would become a bottleneck under simultaneous multi-room editing loads.")

    add_paragraph(doc, '1.2 Microservices Decomposition', bold=True, size=12)
    add_paragraph(doc, "While not a traditional containerized microservices deployment, the system is logically decomposed into independently operable service boundaries:")
    add_paragraph(doc, "• Authentication Service: Handled entirely by Supabase GoTrue. Issues JWTs, manages OAuth providers, and auto-provisions user profiles via PostgreSQL triggers.")
    add_paragraph(doc, "• Collaboration Service: Powered by Liveblocks + Yjs CRDT engine. Manages WebSocket rooms, presence tracking, and conflict-free document state replication.")
    add_paragraph(doc, "• Persistence Service: Supabase PostgreSQL with Row-Level Security (RLS). Stores rooms, memberships, messages, and tasks with fine-grained authorization policies.")
    add_paragraph(doc, "• AI Intelligence Service: The aiAgent.ts middleware routes prompts to the HuggingFace Inference API (Qwen2.5-7B-Instruct) and parses deterministic JSON responses into workspace file operations.")
    add_paragraph(doc, "• Execution Service: Express.js server providing a Liveblocks auth endpoint and a WebSocket-based PTY terminal for remote code execution via xterm.js.")

    add_paragraph(doc, '1.3 Event-Driven Flow', bold=True, size=12)
    add_paragraph(doc, "Events in the system are categorized as follows:")
    add_paragraph(doc, "• CRDT Events: Keystroke deltas captured by Yjs, broadcast via Liveblocks WebSocket to all room peers. These are the highest-frequency events (~50ms cycle).")
    add_paragraph(doc, "• Realtime Database Events: Supabase Realtime listens on the 'messages' and 'tasks' tables via PostgreSQL publications. Any INSERT or UPDATE triggers an instant WebSocket push to subscribed clients.")
    add_paragraph(doc, "• AI Agent Events: User-initiated prompts trigger a synchronous HTTP POST to HuggingFace. The returned file operations are applied as CRDT mutations, which then cascade as standard CRDT events to all peers.")

    add_paragraph(doc, '1.4 Serverless Components', bold=True, size=12)
    add_paragraph(doc, "• Supabase Auth (GoTrue): Serverless identity management. Zero backend code required for user registration, login, or session validation.")
    add_paragraph(doc, "• Supabase PostgreSQL: Fully managed database with automatic backups, connection pooling, and built-in REST/GraphQL APIs.")
    add_paragraph(doc, "• Liveblocks: Serverless real-time infrastructure. WebSocket room management, presence, and CRDT storage are handled by the Liveblocks cloud without any server provisioning.")

    # Component Diagram
    doc.add_paragraph('')
    add_image(doc, "component_diagram.png", "Figure 1: Component Diagram — System Module Decomposition")

    # Use Case Diagram
    doc.add_paragraph('')
    add_image(doc, "use_case_diagram.png", "Figure 2: Use Case Diagram — Actor-System Interactions")

    doc.add_page_break()

    # ──── 2. Database ────
    add_paragraph(doc, '2. Database', bold=True, size=14)

    add_paragraph(doc, '2.1 ER Diagram', bold=True, size=12)
    add_paragraph(doc, "The database layer is built on Supabase-managed PostgreSQL. The Entity-Relationship model comprises five core entities with clearly defined foreign key constraints and role-based access enforcement.")
    add_image(doc, "class_er_diagram.png", "Figure 3: ER / Class Diagram — Database Entity Relationships")

    add_paragraph(doc, '2.2 Schema Design', bold=True, size=12)
    add_paragraph(doc, "The schema is designed with the following tables:")
    add_paragraph(doc, "• profiles: Stores user identity data (id, username, full_name, avatar_url). Primary key references auth.users via ON DELETE CASCADE. Auto-populated by a PostgreSQL trigger (handle_new_user) upon registration.")
    add_paragraph(doc, "• rooms: Defines collaborative workspaces (id, name, slug, created_by, settings). The 'slug' field is UNIQUE to enable human-readable room URLs. 'settings' is a JSONB column for flexible room configuration.")
    add_paragraph(doc, "• room_members: Junction table linking users to rooms with role-based access (admin/member). Enforces UNIQUE(room_id, user_id) to prevent duplicate memberships.")
    add_paragraph(doc, "• messages: Stores real-time chat data per room. Subject to RLS policy requiring the sender to be a verified room member via the is_room_member(room_id) helper function.")
    add_paragraph(doc, "• tasks: Kanban task cards with status tracking (todo, in-progress, done, archived). Supports drag-and-drop ordering via a 'position' integer column.")

    add_paragraph(doc, "Security Implementation:", bold=True)
    add_paragraph(doc, "All five tables have Row-Level Security (RLS) enabled. A SECURITY DEFINER helper function is_room_member(r_id UUID) encapsulates the membership check to prevent infinite recursion in policy evaluation. This function returns TRUE only if the requesting user (auth.uid()) exists in the room_members table for the given room_id.")

    doc.add_page_break()

    # ──── 3. Data Exchange Contract ────
    add_paragraph(doc, '3. Data Exchange Contract', bold=True, size=14)

    add_paragraph(doc, '3.1 Frequency of Data Exchanges', bold=True, size=12)
    add_paragraph(doc, "The platform operates across three distinct frequency tiers:")
    add_paragraph(doc, "• Ultra-High Frequency (~20-50ms): CRDT deltas for collaborative code editing. Every keystroke generates a Yjs update event that is broadcast via Liveblocks WebSocket to all connected peers in the room. This is the most latency-sensitive channel.")
    add_paragraph(doc, "• High Frequency (~100-500ms): Supabase Realtime subscriptions for chat messages and task state changes. These piggyback on PostgreSQL's NOTIFY/LISTEN mechanism via the supabase_realtime publication.")
    add_paragraph(doc, "• On-Demand (~2-5 seconds): AI Agent requests to HuggingFace. These are user-initiated, synchronous HTTP calls that occur only when the user explicitly invokes the AI Pulse interface.")

    add_paragraph(doc, '3.2 Data Sets', bold=True, size=12)
    add_paragraph(doc, "The following data sets are exchanged across service boundaries:")
    add_paragraph(doc, "• Authentication Tokens: JWT (JSON Web Token) containing user ID, email, and session metadata. Issued by Supabase Auth, consumed by all protected endpoints.")
    add_paragraph(doc, "• CRDT State Vectors: Binary-encoded Yjs document states containing the full edit history of all files in a workspace. Exchanged between Yjs local instances and the Liveblocks persistence layer.")
    add_paragraph(doc, "• Chat Payloads: JSON objects containing room_id, user_id, content, and timestamp. Inserted into the messages table and broadcast via Supabase Realtime.")
    add_paragraph(doc, "• Task Payloads: JSON objects containing room_id, title, description, status, assigned_to, and position. Synchronized via Supabase Realtime on the tasks table.")
    add_paragraph(doc, "• AI Agent Payloads: The request payload contains a system prompt (workspace context) and user command. The response payload follows a strict AgentResponse schema: { message: string, files: AgentFileOp[] } where each AgentFileOp contains action (create/update/delete), name, and content.")

    add_paragraph(doc, '3.3 Mode of Exchanges', bold=True, size=12)
    add_paragraph(doc, "• WebSocket (WSS): Primary transport for real-time collaboration (Liveblocks CRDT sync) and database change streams (Supabase Realtime). Provides persistent, bidirectional, full-duplex connections.")
    add_paragraph(doc, "• REST API (HTTPS): Used for Supabase database queries (SELECT, INSERT, UPDATE), authentication endpoints, and the HuggingFace Inference API. All REST calls are authenticated via Bearer JWT tokens.")
    add_paragraph(doc, "• Internal Function Calls: The aiAgent.ts module communicates with the Yjs local document via in-memory JavaScript function calls within the browser context. No network transport is needed for applying AI-generated file operations to the local CRDT state.")

    # DFD Diagram
    doc.add_paragraph('')
    add_image(doc, "dfd_diagram.png", "Figure 4: Data Flow Diagram (Level 1) — System Data Exchange Flows")

    doc.add_page_break()

    # ──── 4. Supporting Diagrams ────
    add_paragraph(doc, '4. Supporting Diagrams', bold=True, size=14)

    add_paragraph(doc, '4.1 Sequence Diagram', bold=True, size=12)
    add_paragraph(doc, "The following sequence diagram illustrates the complete lifecycle of a user session: from authentication through collaborative editing to AI-assisted code generation. It traces every message exchange between the browser clients, the CRDT engine, the Liveblocks WebSocket infrastructure, Supabase services, and the HuggingFace AI backend.")
    add_image(doc, "sequence_diagram.png", "Figure 5: Sequence Diagram — Authentication, Real-Time Editing, and AI Agent Flow")

    doc.add_paragraph('')
    add_paragraph(doc, '4.2 Deployment Diagram', bold=True, size=12)
    add_paragraph(doc, "The deployment diagram maps the logical components to their physical or cloud-hosted deployment targets. Client-side components execute within the user's web browser. The Liveblocks, Supabase, and HuggingFace services are externally managed cloud platforms. The Express.js server can be deployed on a local machine or a VPS for terminal execution capabilities.")
    add_image(doc, "deployment_diagram.png", "Figure 6: Deployment Diagram — Physical Infrastructure and Cloud Service Mapping")

    # Save
    output_path = os.path.join(OUTPUT_DIR, "review_2_architecture_document.docx")
    doc.save(output_path)
    print(f"Architecture Document saved to {output_path}")

if __name__ == '__main__':
    create_architecture_doc()
