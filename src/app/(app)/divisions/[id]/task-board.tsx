"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ListChecks,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  createTask,
  addTaskComment,
  deleteTask,
  toggleChecklistItem,
  updateTask,
  updateTaskStatus,
} from "@/server/actions/tasks";
import { avatarColor, initials } from "@/lib/avatar-color";
import { getUrgency, URGENCY_BADGE_CLASS } from "@/lib/urgency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = { id: number; name: string };

type ChecklistItem = { id: number; label: string; isDone: boolean };

type TaskComment = {
  id: number;
  body: string;
  createdAt: string;
  userName: string;
};

type TaskItem = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  deadline: string | null;
  pic: Member | null;
  checklist: ChecklistItem[];
  comments: TaskComment[];
};

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "To-do" },
  { status: "IN_PROGRESS", label: "Dikerjakan" },
  { status: "DONE", label: "Selesai" },
];

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function TaskCardBody({
  task,
  canEdit,
  pending,
  onMove,
}: {
  task: TaskItem;
  canEdit: boolean;
  pending: boolean;
  onMove: (task: TaskItem, direction: -1 | 1) => void;
}) {
  const checkDone = task.checklist.filter((c) => c.isDone).length;
  const urgency = getUrgency(task.deadline, task.status === "DONE");
  const picColor = task.pic ? avatarColor(task.pic.name) : null;

  return (
    <CardContent className="p-3">
      <p className="text-sm font-medium text-slate-900">{task.title}</p>

      {task.checklist.length > 0 && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${Math.round((checkDone / task.checklist.length) * 100)}%`,
            }}
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge
          variant="outline"
          className={`border-transparent font-normal ${URGENCY_BADGE_CLASS[urgency]}`}
        >
          <CalendarDays className="mr-1 h-3 w-3" />
          {task.deadline ? formatDeadline(task.deadline) : "Belum ada tenggat"}
        </Badge>
        {task.checklist.length > 0 && (
          <span className="flex items-center gap-1 text-slate-500">
            <ListChecks className="h-3.5 w-3.5" />
            {checkDone}/{task.checklist.length}
          </span>
        )}
        <span
          title={task.pic ? task.pic.name : "Belum ada PIC"}
          className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
            picColor
              ? `${picColor.bg} ${picColor.text}`
              : "border border-dashed border-slate-300 text-slate-400"
          }`}
        >
          {task.pic ? initials(task.pic.name) : "?"}
        </span>
      </div>
      {canEdit && (
        <div
          className="mt-2 flex justify-between"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={task.status === "TODO" || pending}
            onClick={() => onMove(task, -1)}
            aria-label="Mundurkan status"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={task.status === "DONE" || pending}
            onClick={() => onMove(task, 1)}
            aria-label="Majukan status"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </CardContent>
  );
}

/** Draggable task card. Short clicks still open the detail dialog — dnd-kit
 * only starts a drag once the pointer moves past the activation distance,
 * so a tap/click passes through untouched. */
function DraggableTaskCard({
  task,
  canEdit,
  pending,
  onOpen,
  onMove,
}: {
  task: TaskItem;
  canEdit: boolean;
  pending: boolean;
  onOpen: (task: TaskItem) => void;
  onMove: (task: TaskItem, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled: !canEdit });

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="touch-none cursor-pointer py-0 transition-colors hover:border-slate-400"
      onClick={() => onOpen(task)}
    >
      <TaskCardBody
        task={task}
        canEdit={canEdit}
        pending={pending}
        onMove={onMove}
      />
    </Card>
  );
}

/** Droppable column — highlights while a card is dragged over it. */
function DroppableColumn({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-3 transition-colors ${
        isOver ? "bg-red-50 ring-2 ring-red-200" : "bg-slate-100/60"
      }`}
    >
      {children}
    </div>
  );
}

export function TaskBoard({
  divisionId,
  tasks,
  members,
  canEdit,
  canComment,
}: {
  divisionId: number;
  tasks: TaskItem[];
  members: Member[];
  canEdit: boolean;
  canComment: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<TaskItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    picUserId: "none",
    deadline: "",
    checklistText: "",
  });

  const detailTask = detail
    ? (tasks.find((t) => t.id === detail.id) ?? null)
    : null;

  function resetForm() {
    setForm({
      title: "",
      description: "",
      picUserId: "none",
      deadline: "",
      checklistText: "",
    });
  }

  function openEdit(task: TaskItem) {
    setForm({
      title: task.title,
      description: task.description ?? "",
      picUserId: task.pic ? String(task.pic.id) : "none",
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      checklistText: "",
    });
    setCommentText("");
    setDetail(task);
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createTask(divisionId, {
        title: form.title,
        description: form.description,
        picUserId: form.picUserId === "none" ? null : Number(form.picUserId),
        deadline: form.deadline,
        checklist: form.checklistText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tugas ditambahkan");
      setAddOpen(false);
      resetForm();
    });
  }

  function handleSaveDetail() {
    if (!detailTask) return;
    startTransition(async () => {
      const result = await updateTask(detailTask.id, {
        title: form.title,
        description: form.description,
        picUserId: form.picUserId === "none" ? null : Number(form.picUserId),
        deadline: form.deadline,
        checklist: [],
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tugas diperbarui");
      setDetail(null);
    });
  }

  function changeStatus(task: TaskItem, next: TaskStatus) {
    if (next === task.status) return;
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, next);
      if (result.error) toast.error(result.error);
    });
  }

  function handleMove(task: TaskItem, direction: -1 | 1) {
    const order: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
    const next = order[order.indexOf(task.status) + direction];
    if (!next) return;
    changeStatus(task, next);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    changeStatus(task, over.id as TaskStatus);
  }

  function handleDelete(task: TaskItem) {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tugas dihapus");
      setDetail(null);
    });
  }

  function handleToggleItem(item: ChecklistItem, checked: boolean) {
    startTransition(async () => {
      const result = await toggleChecklistItem(item.id, checked);
      if (result.error) toast.error(result.error);
    });
  }

  function handleAddComment() {
    if (!detailTask || !commentText.trim()) return;
    startTransition(async () => {
      const result = await addTaskComment(detailTask.id, { body: commentText });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Komentar ditambahkan");
      setCommentText("");
    });
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Tambah tugas
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status}>
                <p className="mb-3 text-sm font-medium text-slate-600">
                  {col.label} · {colTasks.length}
                </p>
                <DroppableColumn status={col.status}>
                  <div className="space-y-2">
                    {colTasks.length === 0 && (
                      <p className="py-6 text-center text-xs text-slate-400">
                        Tidak ada tugas
                      </p>
                    )}
                    {colTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        canEdit={canEdit}
                        pending={pending}
                        onOpen={openEdit}
                        onMove={handleMove}
                      />
                    ))}
                  </div>
                </DroppableColumn>
              </div>
            );
          })}
        </div>
      </DndContext>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah tugas</DialogTitle>
          </DialogHeader>
          <TaskForm form={form} setForm={setForm} members={members} withChecklist />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={pending || !form.title.trim()}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                "Tambah tugas"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTask} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canEdit ? "Detail tugas" : detailTask?.title}</DialogTitle>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4">
              {canEdit ? (
                <TaskForm form={form} setForm={setForm} members={members} />
              ) : (
                detailTask.description && (
                  <p className="text-sm text-slate-600">
                    {detailTask.description}
                  </p>
                )
              )}

              {detailTask.checklist.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Checklist
                  </p>
                  <div className="space-y-2">
                    {detailTask.checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <Checkbox
                          checked={item.isDone}
                          disabled={!canEdit || pending}
                          onCheckedChange={(v) =>
                            handleToggleItem(item, v === true)
                          }
                        />
                        <span className={item.isDone ? "line-through text-slate-400" : ""}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-slate-50/70 p-3">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MessageSquare className="h-4 w-4" />
                  Komentar ({detailTask.comments.length})
                </p>
                {detailTask.comments.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Belum ada komentar untuk tugas ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detailTask.comments.map((comment) => (
                      <div key={comment.id} className="rounded-md bg-white p-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-700">
                            {comment.userName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleTimeString(
                              "id-ID",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                        <p className="whitespace-pre-line text-sm text-slate-600">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {canComment && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Tulis komentar..."
                      aria-label="Komentar tugas"
                      className="min-h-16"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleAddComment}
                      disabled={pending || !commentText.trim()}
                      aria-label="Kirim komentar"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {canEdit && (
                <DialogFooter className="flex items-center sm:justify-between">
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(detailTask)}
                    disabled={pending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Hapus
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setDetail(null)}
                      disabled={pending}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleSaveDetail} disabled={pending}>
                      {pending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan…
                        </>
                      ) : (
                        "Simpan"
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskForm({
  form,
  setForm,
  members,
  withChecklist = false,
}: {
  form: {
    title: string;
    description: string;
    picUserId: string;
    deadline: string;
    checklistText: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  members: Member[];
  withChecklist?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Judul</Label>
        <Input
          id="task-title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Booking ruangan aula"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-desc">Deskripsi</Label>
        <Textarea
          id="task-desc"
          rows={2}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>PIC</Label>
          <Select
            value={form.picUserId}
            onValueChange={(v) => setForm((f) => ({ ...f, picUserId: v }))}
          >
            <SelectTrigger aria-label="PIC">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Belum ditentukan</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-deadline">Deadline</Label>
          <Input
            id="task-deadline"
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm((f) => ({ ...f, deadline: e.target.value }))
            }
          />
        </div>
      </div>
      {withChecklist && (
        <div className="space-y-2">
          <Label htmlFor="task-checklist">
            Checklist (satu item per baris, opsional)
          </Label>
          <Textarea
            id="task-checklist"
            rows={3}
            value={form.checklistText}
            onChange={(e) =>
              setForm((f) => ({ ...f, checklistText: e.target.value }))
            }
            placeholder={"Sound system\nProyektor\nKabel roll 5 pcs"}
          />
        </div>
      )}
    </div>
  );
}
