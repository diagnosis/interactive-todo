// src/components/task/TaskRow.tsx
import type { Task } from "../../types/taskAndTeam"

interface TaskRowProps {
    task: Task
    assigneeName: string | null
    onView: (task: Task) => void
    onEdit: (task: Task) => void
    onDelete: (task: Task) => void
}

function getDueLabel(dueAtISO: string) {
    const due = new Date(dueAtISO)
    const now = new Date()

    const msPerDay = 1000 * 60 * 60 * 24
    // ceil so that “later today” is treated as 0, “tomorrow” as 1, etc.
    const diffDays = Math.ceil(
        (due.getTime() - now.getTime()) / msPerDay,
    )

    if (Number.isNaN(diffDays)) {
        return { label: "No due date", className: "bg-slate-100 text-slate-600" }
    }

    if (diffDays < 0) {
        return {
            label: `${Math.abs(diffDays)}d overdue`,
            className: "bg-red-100 text-red-700",
        }
    }

    if (diffDays === 0) {
        return {
            label: "Due today",
            className: "bg-amber-100 text-amber-700",
        }
    }

    return {
        label: `Due in ${diffDays}d`,
        className: "bg-emerald-100 text-emerald-700",
    }
}

export function TaskRow({
                            task,
                            assigneeName,
                            onView,
                            onEdit,
                            onDelete,
                        }: TaskRowProps) {
    const { label: dueLabel, className: dueClass } = getDueLabel(task.due_at)

    return (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-sm">
            <div className="flex flex-col gap-1">
                <button
                    type="button"
                    onClick={() => onView(task)}
                    className="text-left font-medium text-slate-800 hover:underline"
                >
                    {task.title}
                </button>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {assigneeName && (
                        <span>Assignee: {assigneeName}</span>
                    )}

                    {/* days left badge */}
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${dueClass}`}
                    >
            {dueLabel}
          </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* status pill */}
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                        task.status === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : task.status === "in_progress"
                                ? "bg-amber-100 text-amber-700"
                                : task.status === "canceled"
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-emerald-50 text-emerald-700"
                    }`}
                >
          {task.status.replace("_", " ")}
        </span>

                <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                    Edit
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(task)}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}