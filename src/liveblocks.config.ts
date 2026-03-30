import { createClient, LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { supabase } from "./lib/supabase";

export const authEndpoint = async (room: any) => {
    console.log(`[Liveblocks] Auth requested for room:`, room);

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.error("[Liveblocks] No Supabase session found!");
            return { error: "No session" };
        }

        console.log("[Liveblocks] Fetching token from /api/liveblocks-auth...");

        const response = await fetch("/api/liveblocks-auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ room }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Liveblocks] Auth server returned ${response.status}:`, text);
            throw new Error("Auth failed");
        }

        const data = await response.json();
        console.log("[Liveblocks] Auth successful, token received.");
        return data;
    } catch (error) {
        console.error("[Liveblocks] Auth error:", error);
        throw error;
    }
};

export const client = createClient({
    authEndpoint,
});

export enum LayerType {
    Rectangle,
    Ellipse,
    Path,
    Text,
}

export type RectangleLayer = {
    type: LayerType.Rectangle;
    x: number;
    y: number;
    height: number;
    width: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    fillStyle?: 'solid' | 'transparent';
};

export type EllipseLayer = {
    type: LayerType.Ellipse;
    x: number;
    y: number;
    height: number;
    width: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    fillStyle?: 'solid' | 'transparent';
};

export type PathLayer = {
    type: LayerType.Path;
    x: number;
    y: number;
    height: number;
    width: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    fillStyle?: 'solid' | 'transparent';
    points: number[][];
};

export type TextLayer = {
    type: LayerType.Text;
    x: number;
    y: number;
    height: number;
    width: number;
    fill: string;
    text: string;
    stroke?: string;
    strokeWidth?: number;
    fillStyle?: 'solid' | 'transparent';
};

export type Layer = RectangleLayer | EllipseLayer | PathLayer | TextLayer;

export type FileData = {
    name: string;
    content: string;
    type: "file" | "folder";
};

type Presence = {
    cursor: { x: number; y: number } | null;
    selectedLayerId: string | null;
    pencilColor: string | null;
    isTyping: boolean;
    activeFileId: string | null;
    isInHuddle?: boolean;
};

type Storage = {
    layers: LiveMap<string, LiveObject<Layer>>;
    layerIds: LiveList<string>;
    files: LiveMap<string, LiveObject<FileData>>;
};

type UserMeta = {
    id: string;
    info: {
        name: string;
        avatar: string;
        color: string;
    };
};

type RoomEvent =
    | { type: 'CHAT_MESSAGE'; text: string }
    | { type: 'file_created'; fileName: string; userName: string }
    | { type: 'file_updated'; fileName: string; userName: string }
    | { type: 'task_added'; taskTitle: string; userName: string }
    | { type: 'task_done'; taskTitle: string; userName: string }
    | { type: 'member_joined'; userName: string }
    | { type: 'message_sent'; userName: string; preview: string }
    | { type: 'ai_ran'; command: string; userName: string };

const context = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export const RoomProvider = context.RoomProvider;
export const useOthers = context.useOthers;
export const useSelf = context.useSelf;
export const useMyPresence = context.useMyPresence;
export const useUpdateMyPresence = context.useUpdateMyPresence;
export const useRoom = context.useRoom;
export const useStorage = context.useStorage;
export const useMutation = context.useMutation;
export const useCanUndo = context.useCanUndo;
export const useCanRedo = context.useCanRedo;
export const useHistory = context.useHistory;
export const useBroadcastEvent = context.useBroadcastEvent;
export const useEventListener = context.useEventListener;
// Note: LiveblocksProvider is usually imported from @liveblocks/react directly for the client-wide provider.
// However, typing the whole client can be done via the client prop in the standard LiveblocksProvider.
