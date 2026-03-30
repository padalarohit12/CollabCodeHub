import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "../lib/supabase";
import { Plus, MoreHorizontal, Clock, Hash, AlertTriangle, CheckCircle2, Loader2, Share2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useSelf, useBroadcastEvent } from "../liveblocks.config";

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    position: number;
}

const COLUMNS = [
    { id: "todo", title: "To Do", icon: <Hash size={16} /> },
    { id: "in-progress", title: "In Progress", icon: <Clock size={16} /> },
    { id: "done", title: "Done", icon: <CheckCircle2 size={16} /> },
    { id: "archived", title: "Backlog", icon: <AlertTriangle size={16} /> },
];

export function TaskBoard({ roomId }: { roomId: string }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingTo, setAddingTo] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const self = useSelf();
    const broadcastActivity = useBroadcastEvent();

    useEffect(() => {
        fetchTasks();

        // Subscribe to task changes
        const channel = supabase
            .channel(`tasks:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "tasks",
                    filter: `room_id=eq.${roomId}`,
                },
                () => {
                    fetchTasks(); // Simple re-fetch on any change for consistency
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const fetchTasks = async () => {
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("room_id", roomId)
                .order("position", { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        // Optimistic Update
        const updatedTasks = [...tasks];
        const draggedTaskIndex = updatedTasks.findIndex(t => t.id === draggableId);
        if (draggedTaskIndex === -1) return;

        const [draggedTask] = updatedTasks.splice(draggedTaskIndex, 1);
        draggedTask.status = destination.droppableId;

        // Insert at new position
        const colTasks = updatedTasks.filter(t => t.status === destination.droppableId);
        const otherTasks = updatedTasks.filter(t => t.status !== destination.droppableId);

        colTasks.splice(destination.index, 0, draggedTask);

        // Re-calculate positions for the column
        const reorderedTasks = [
            ...otherTasks,
            ...colTasks.map((t, idx) => ({ ...t, position: idx }))
        ];

        setTasks(reorderedTasks);

        // Persist to Supabase
        try {
            const { error } = await supabase
                .from("tasks")
                .update({
                    status: destination.droppableId,
                    position: destination.index,
                    updated_at: new Date().toISOString()
                })
                .eq("id", draggableId);

            if (error) throw error;

            if (destination.droppableId === "done") {
                const task = tasks.find(t => t.id === draggableId);
                broadcastActivity({
                    type: 'task_done',
                    taskTitle: task?.title || "Task",
                    userName: self?.info?.name || "User"
                });
            }

        } catch (error) {
            console.error("Error updating task position:", error);
            fetchTasks(); // Rollback
        }
    };

    const addNewTask = async (status: string) => {
        if (!newTaskTitle.trim()) return;

        // Calculate legacy max position safely
        const maxPos = tasks.filter(t => t.status === status).length * 1000 + 1000;

        try {
            console.log("Adding task:", { title: newTaskTitle, status, roomId });
            const { data, error } = await supabase
                .from("tasks")
                .insert({
                    title: newTaskTitle.trim(),
                    status: status,
                    position: maxPos,
                    room_id: roomId,
                    priority: "medium"
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase Error adding task:", error);
                throw error;
            }

            // Optimistic update (or wait for subscription)
            // We wait for subscription usually, but let's add it to state for instant feedback
            if (data) {
                setTasks(prev => [...prev, data]);
                broadcastActivity({
                    type: 'task_added',
                    taskTitle: newTaskTitle.trim(),
                    userName: self?.info?.name || "User"
                });
            }

            setNewTaskTitle("");
            // keep addingTo open for rapid entry if needed, or close it. 
            // User might want to add multiple. Let's keep it open but clear title.
            // setAddingTo(null); 
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task. Please check your connection or permissions.");
        }
    };

    const shareToChat = async (task: Task) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('messages')
                .insert({
                    room_id: roomId,
                    user_id: user.id,
                    content: `📌 Task Update: "${task.title}" (Status: ${task.status.replace('_', ' ').toUpperCase()})`
                });

            if (error) throw error;
            // Native notification feel
        } catch (error) {
            console.error('Error sharing task to chat:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#0c0c0e]">
            <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-[#0f0f12]/30">
                <div>
                    <h2 className="text-lg font-bold text-white">Kanban Board</h2>
                    <p className="text-xs text-slate-500 font-medium">Manage project sprints and milestones</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-24 rounded-lg bg-slate-800/50 border border-slate-700/50" />
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-500 transition-colors">
                        <Plus size={18} />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-x-auto p-8 custom-scrollbar">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-6 min-h-[500px]">
                        {COLUMNS.map((column) => (
                            <div key={column.id} className="flex flex-col w-[300px] flex-shrink-0 group">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">{column.icon}</span>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            {column.title}
                                        </h3>
                                        <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-500">
                                            {tasks.filter(t => t.status === column.id).length}
                                        </span>
                                    </div>
                                    <button className="text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>

                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={cn(
                                                "flex-1 flex flex-col gap-3 p-2 rounded-2xl transition-colors duration-200",
                                                snapshot.isDraggingOver ? "bg-slate-800/30" : "bg-transparent"
                                            )}
                                        >
                                            {tasks
                                                .filter((t) => t.status === column.id)
                                                .map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={cn(
                                                                    "group relative flex flex-col gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl transition-all hover:border-slate-700 hover:bg-slate-800/80",
                                                                    snapshot.isDragging && "scale-[1.02] border-indigo-500/50 shadow-2xl shadow-indigo-500/10 z-50 bg-slate-800"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border leading-none",
                                                                        task.priority === 'urgent' && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                                                                        task.priority === 'high' && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                                                        task.priority === 'medium' && "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                                                                        task.priority === 'low' && "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                                                    )}>
                                                                        {task.priority}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => shareToChat(task)}
                                                                            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                                                                            title="Share to Chat"
                                                                        >
                                                                            <Share2 size={14} />
                                                                        </button>
                                                                        <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                                                                            <MoreHorizontal size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <h4 className="text-sm font-bold text-slate-200 line-clamp-2 leading-snug">
                                                                    {task.title}
                                                                </h4>

                                                                {task.description && (
                                                                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                                        {task.description}
                                                                    </p>
                                                                )}

                                                                <div className="flex items-center justify-between mt-1">
                                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                                        #{task.id.substring(0, 4)}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-slate-600">
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-700" title="Priority Indicator" />
                                                                        <span className="text-[10px] font-bold capitalize">{task.priority}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                            {provided.placeholder}

                                            {addingTo === column.id ? (
                                                <div className="p-2 border-t border-slate-800">
                                                    <input
                                                        autoFocus
                                                        className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                                                        placeholder="Task title..."
                                                        value={newTaskTitle}
                                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && addNewTask(column.id)}
                                                        onBlur={() => { if (!newTaskTitle) setAddingTo(null); }}
                                                    />
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => addNewTask(column.id)}
                                                            className="flex-1 bg-indigo-600 text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
                                                        >
                                                            Add Task
                                                        </button>
                                                        <button
                                                            onClick={() => setAddingTo(null)}
                                                            className="flex-1 bg-slate-800 text-slate-400 text-[10px] font-bold py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setAddingTo(column.id)}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors bg-transparent hover:bg-slate-800/20 rounded-xl mt-1"
                                                >
                                                    <Plus size={14} />
                                                    New Task
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}

                        <div className="w-[300px] flex-shrink-0 border-2 border-dashed border-slate-800/50 rounded-2xl flex items-center justify-center group cursor-pointer hover:border-slate-700/50 transition-colors h-[100px]">
                            <Plus size={24} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
                        </div>
                    </div>
                </DragDropContext>
            </main>
        </div>
    );
}
