import { useState, useCallback } from "react";
import {
    useOthers,
    useMyPresence,
    useStorage,
    useMutation,
    useSelf,
    LayerType,
    Layer
} from "../liveblocks.config";
import {
    MousePointer2,
    Pencil,
    Square,
    Circle,
    Trash2,
    Type,
    Minus,
    Plus,
    BoxSelect
} from "lucide-react";
import { cn } from "../lib/utils";
import { LiveObject, LiveMap, LiveList } from "@liveblocks/client";

const COLORS = [
    "#f87171", "#fb923c", "#fbbf24", "#4ade80", "#2dd4bf",
    "#38bdf8", "#818cf8", "#a78bfa", "#f472b6", "#94a3b8",
    "#ffffff", "#000000"
];

export function Whiteboard() {
    const layers = useStorage((root) => root.layers);
    const layerIds = useStorage((root) => root.layerIds);
    const others = useOthers();
    const self = useSelf();
    const [, updateMyPresence] = useMyPresence();

    const [activeTool, setActiveTool] = useState<'select' | 'pencil' | 'rect' | 'circle' | 'text' | 'eraser'>('pencil');
    const [selectedColor, setSelectedColor] = useState(COLORS[6]);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [fillStyle, setFillStyle] = useState<'solid' | 'transparent'>('solid');

    const [isDrawing, setIsDrawing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);

    // Track initial drag/resize positions to calculate deltas
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [initialLayerBounds, setInitialLayerBounds] = useState<any>(null);

    // --- Interaction Handlers ---
    const onPointerMove = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        const current = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
        updateMyPresence({ cursor: current });

        if (isDrawing && activeTool !== 'select') {
            updateDrawing(current);
        } else if (isDragging && activeTool === 'select' && dragStart) {
            moveSelectedLayer(current);
        } else if (isResizing && activeTool === 'select' && dragStart) {
            resizeSelectedLayer(current);
        }
    }, [updateMyPresence, isDrawing, isDragging, isResizing, activeTool, dragStart]);

    const onPointerLeave = useCallback(() => {
        updateMyPresence({ cursor: null });
    }, [updateMyPresence]);

    const onPointerDown = (e: React.PointerEvent) => {
        const point = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
        setDragStart(point);

        if (activeTool === 'select') {
            // Hit testing is handled by LayerComponent onClick for selection.
            // But if we click background, deselect.
            // We'll let `startDrawing` handle the background click logic if no layer stopped propagation.
            if (e.target === e.currentTarget) {
                updateMyPresence({ selectedLayerId: null });
            }
        } else {
            startDrawing(e);
        }
    };

    const onPointerUp = useCallback(() => {
        setIsDrawing(false);
        setIsDragging(false);
        setIsResizing(false);
        setDragStart(null);
        setInitialLayerBounds(null);
    }, []);

    // --- Mutations ---
    const startDrawing = useMutation(({ storage, setMyPresence }, e: React.PointerEvent) => {
        // Only start if tool is not select/eraser (handled elsewhere)
        if (activeTool === 'select' || activeTool === 'eraser') return;

        setIsDrawing(true);
        const point = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
        const id = Math.random().toString(36).substring(2, 9);

        let newLayer: Layer;

        if (activeTool === 'pencil') {
            newLayer = {
                type: LayerType.Path,
                x: point.x,
                y: point.y,
                height: 1,
                width: 1,
                fill: selectedColor,
                strokeWidth: strokeWidth,
                points: [[point.x, point.y]]
            };
        } else if (activeTool === 'rect') {
            newLayer = {
                type: LayerType.Rectangle,
                x: point.x,
                y: point.y,
                height: 1,
                width: 1,
                fill: selectedColor,
                fillStyle: fillStyle,
                strokeWidth: strokeWidth
            };
        } else if (activeTool === 'circle') {
            newLayer = {
                type: LayerType.Ellipse,
                x: point.x,
                y: point.y,
                height: 1,
                width: 1,
                fill: selectedColor,
                fillStyle: fillStyle,
                strokeWidth: strokeWidth
            };
        } else if (activeTool === 'text') {
            newLayer = {
                type: LayerType.Text,
                x: point.x,
                y: point.y,
                height: 40,
                width: 100,
                fill: selectedColor,
                text: "Text",
                strokeWidth: 0
            };
            setIsDrawing(false); // Text is instant placement
        } else {
            return;
        }

        let layersMap = storage.get("layers");
        let layersList = storage.get("layerIds");

        if (!layersMap) {
            storage.set("layers", new LiveMap());
            layersMap = storage.get("layers");
        }
        if (!layersList) {
            storage.set("layerIds", new LiveList([]));
            layersList = storage.get("layerIds");
        }

        layersMap.set(id, new LiveObject(newLayer));
        layersList.push(id);

        setMyPresence({ selectedLayerId: id });
    }, [activeTool, selectedColor, strokeWidth, fillStyle]);

    const updateDrawing = useMutation(({ storage, self }, point: { x: number, y: number }) => {
        const id = self.presence.selectedLayerId;
        if (!id) return;

        const layers = storage.get("layers");
        const layer = layers.get(id);
        if (!layer) return;

        const layerData = layer.toObject() as Layer;

        if (layerData.type === LayerType.Path) {
            const newPoints = [...layerData.points, [point.x, point.y]];
            (layer as any).set("points", newPoints);
        } else if (layerData.type !== LayerType.Text) {
            const width = point.x - layerData.x;
            const height = point.y - layerData.y;
            layer.update({
                width: Math.abs(width),
                height: Math.abs(height),
                x: width < 0 ? point.x : layerData.x,
                y: height < 0 ? point.y : layerData.y,
            });
        }
    }, []);

    const moveSelectedLayer = useMutation(({ storage, self }, point: { x: number, y: number }) => {
        const id = self.presence.selectedLayerId;
        if (!id || !dragStart || !initialLayerBounds) return;

        const layers = storage.get("layers");
        const layer = layers.get(id);
        if (!layer) return;

        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;

        layer.update({
            x: initialLayerBounds.x + dx,
            y: initialLayerBounds.y + dy
        });
    }, [dragStart, initialLayerBounds]);

    const resizeSelectedLayer = useMutation(({ storage, self }, point: { x: number, y: number }) => {
        const id = self.presence.selectedLayerId;
        if (!id || !dragStart || !initialLayerBounds || !resizeHandle) return;

        const layers = storage.get("layers");
        const layer = layers.get(id);
        if (!layer) return;

        // Simple resize logic: calculate new bounds based on handle
        // For MVP, implementing bottom-right resize only (easiest)
        // Or calculating delta for the specific handle

        // Let's implement full SE resize for now to keep it robust
        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;

        // This is a simplified resize that works like scaling from top-left if dragging SE
        // A full implementation requires switch case for 8 handles
        if (resizeHandle === 'se') {
            layer.update({
                width: Math.max(10, initialLayerBounds.width + dx),
                height: Math.max(10, initialLayerBounds.height + dy)
            });
        }
    }, [dragStart, initialLayerBounds, resizeHandle]);

    const deleteSelected = useMutation(({ storage, self }) => {
        const selectedId = self.presence.selectedLayerId;
        if (!selectedId) return;
        const layers = storage.get("layers");
        const layerIds = storage.get("layerIds");
        if (layers) layers.delete(selectedId);
        if (layerIds) {
            const index = layerIds.indexOf(selectedId);
            if (index !== -1) layerIds.delete(index);
        }
    }, []);

    const updateLayerText = useMutation(({ storage }, layerId: string, text: string) => {
        const layers = storage.get("layers");
        const layer = layers?.get(layerId);
        if (layer) layer.update({ text });
    }, []);

    // --- Helpers ---
    const handleLayerClick = useCallback((e: React.MouseEvent, layerId: string, layer: Layer) => {
        e.stopPropagation();
        if (activeTool === 'eraser') {
            // Delete layer
            // (Use mutation directly effectively)
            // We can't call mutation inside callback easily without passing it...
            // But we can set a flag or use a ref. 
            // Actually, we can just trigger a separate deletion action if we had it exposed.
            // For now, let's rely on global state or pass deleter.
        } else if (activeTool === 'select') {
            updateMyPresence({ selectedLayerId: layerId });
            setDragStart({ x: e.clientX, y: e.clientY });
            setInitialLayerBounds({ x: layer.x, y: layer.y, width: layer.width, height: layer.height });
            setIsDragging(true);
        }
    }, [activeTool, updateMyPresence]);

    // Load data
    const safeLayers = layers || new Map();
    const safeLayerIds = layerIds || [];
    const selection = self?.presence?.selectedLayerId;

    return (
        <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-[#0c0c0e]"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            {/* Toolbar */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 rounded-2xl bg-[#0f0f12]/80 backdrop-blur-xl border border-slate-800 shadow-2xl z-50">
                <ToolButton icon={<MousePointer2 size={20} />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} label="Select" />
                <ToolButton icon={<Pencil size={20} />} active={activeTool === 'pencil'} onClick={() => setActiveTool('pencil')} label="Pencil" />
                <ToolButton icon={<Square size={20} />} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} label="Rectangle" />
                <ToolButton icon={<Circle size={20} />} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} label="Circle" />
                <ToolButton icon={<Type size={20} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} label="Text" />
                <div className="h-px w-8 bg-slate-800 my-1 mx-auto" />
                <button
                    onClick={deleteSelected}
                    className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    title="Delete Selected"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Styling Palette (Visible for relevant tools) */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2 flex flex-col gap-4 p-4 rounded-3xl bg-[#0f0f12]/80 backdrop-blur-xl border border-slate-800 shadow-2xl z-50">
                {/* Colors */}
                <div className="grid grid-cols-2 gap-2">
                    {COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                                "h-6 w-6 rounded-full border-2 border-transparent transition-all hover:scale-110",
                                selectedColor === color && "border-white ring-2 ring-indigo-500/50"
                            )}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>

                <div className="h-px bg-slate-800 w-full" />

                {/* Stroke/Fill Controls */}
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Params</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFillStyle(fillStyle === 'solid' ? 'transparent' : 'solid')}
                            className={cn("p-1.5 rounded-lg border", fillStyle === 'transparent' ? "border-indigo-500 text-indigo-400" : "border-slate-700 text-slate-500")}
                            title="Toggle Fill"
                        >
                            <BoxSelect size={16} />
                        </button>
                        <div className="flex items-center bg-slate-800 rounded-lg p-1">
                            <button onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))} className="p-1 hover:text-white text-slate-400"><Minus size={12} /></button>
                            <span className="text-xs w-4 text-center text-white">{strokeWidth}</span>
                            <button onClick={() => setStrokeWidth(Math.min(10, strokeWidth + 1))} className="p-1 hover:text-white text-slate-400"><Plus size={12} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <svg className="flex-1 w-full h-full touch-none">
                <g>
                    {safeLayerIds.map((id: string) => {
                        const layer = safeLayers.get(id);
                        if (!layer) return null;
                        const isSelected = selection === id;

                        return (
                            <g key={id}>
                                <LayerComponent
                                    layer={layer as any}
                                    onClick={(e) => handleLayerClick(e, id, layer as any)}
                                    onTextChange={(text) => updateLayerText(id, text)}
                                    isSelected={isSelected}
                                />
                                {isSelected && activeTool === 'select' && (
                                    <SelectionBox
                                        layer={layer as any}
                                        onResizeStart={(e, handle) => {
                                            e.stopPropagation();
                                            setIsResizing(true);
                                            setResizeHandle(handle);
                                            setDragStart({ x: e.clientX, y: e.clientY });
                                            setInitialLayerBounds({ x: layer.x, y: layer.y, width: layer.width, height: layer.height });
                                        }}
                                    />
                                )}
                            </g>
                        );
                    })}
                </g>

                {/* Live Cursors */}
                {others.map(({ connectionId, presence, id }) => {
                    if (!presence?.cursor) return null;
                    return (
                        <Cursor
                            key={connectionId}
                            x={presence.cursor.x}
                            y={presence.cursor.y}
                            color={`hsl(${connectionId * 40}, 70%, 60%)`}
                            label={id ? id.substring(0, 5) : 'Anonymous'}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

// ... (Subcomponents: ToolButton, Cursor, LayerComponent, SelectionBox, Helper functions) ...
// Note: I will need to insert the subcomponents definitions below.
// I'll assume I replace the whole file and add the subcomponents.
function LayerComponent({ layer, onClick }: { layer: Layer, onClick: (e: React.MouseEvent) => void, onTextChange?: (text: string) => void, isSelected?: boolean }) {
    // ... same as before but using strokeWidth and fillStyle logic logic

    // Determine fill/stroke based on style
    const fill = layer.fillStyle === 'transparent' ? 'transparent' : layer.fill;
    const stroke = layer.stroke || layer.fill;
    const strokeWidth = layer.strokeWidth || 0;

    switch (layer.type) {
        case LayerType.Rectangle:
            return (
                <rect
                    onPointerDown={onClick}
                    x={layer.x}
                    y={layer.y}
                    width={layer.width}
                    height={layer.height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className="cursor-pointer hover:opacity-90"
                />
            );
        case LayerType.Ellipse:
            return (
                <ellipse
                    onPointerDown={onClick}
                    cx={layer.x + layer.width / 2}
                    cy={layer.y + layer.height / 2}
                    rx={layer.width / 2}
                    ry={layer.height / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className="cursor-pointer hover:opacity-90"
                />
            );
        case LayerType.Path:
            return (
                <path
                    onPointerDown={onClick}
                    d={getSvgPathFromStroke(layer.points)}
                    fill="none"
                    stroke={layer.fill}
                    strokeWidth={layer.strokeWidth || 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer hover:opacity-90"
                />
            );
        case LayerType.Text:
            // ... existing text logic
            return (
                <foreignObject
                    onPointerDown={onClick}
                    x={layer.x}
                    y={layer.y}
                    width={Math.max(100, layer.width)}
                    height={Math.max(40, layer.height)}
                >
                    <div className="text-white font-bold px-1 select-none" style={{ fontSize: '16px', color: layer.fill }}>{layer.text || "Text"}</div>
                </foreignObject>
            )
        default:
            return null;
    }
}

function SelectionBox({ layer, onResizeStart }: { layer: Layer, onResizeStart: (e: React.PointerEvent, handle: string) => void }) {
    if (layer.type === LayerType.Path) return null; // No resize for paths yet

    return (
        <g>
            {/* Outline */}
            <rect
                x={layer.x}
                y={layer.y}
                width={layer.width}
                height={layer.height}
                fill="none"
                stroke="#6366f1"
                strokeWidth={1}
                pointerEvents="none"
            />
            {/* Handles - SE only for MVP */}
            <rect
                x={layer.x + layer.width - 4}
                y={layer.y + layer.height - 4}
                width={8}
                height={8}
                fill="white"
                stroke="#6366f1"
                strokeWidth={1}
                className="cursor-se-resize"
                onPointerDown={(e) => onResizeStart(e, 'se')}
            />
        </g>
    );
}

function getSvgPathFromStroke(points: number[][]) {
    if (!points?.length) return "";
    return points.reduce((acc, [x, y], i) => {
        return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
}

function Cursor({ x, y, color, label }: { x: number, y: number, color: string, label: string }) {
    return (
        <foreignObject x={x} y={y} width="100" height="50" style={{ pointerEvents: 'none' }}>
            <div className="relative">
                <MousePointer2 size={20} style={{ color: color, fill: color }} />
                <div className="absolute left-4 top-4 px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-slate-800 border border-white/10" style={{ backgroundColor: color }}>
                    {label}
                </div>
            </div>
        </foreignObject>
    );
}

function ToolButton({ icon, active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={cn(
                "group relative h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200",
                active ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            )}
        >
            {icon}
        </button>
    );
}
