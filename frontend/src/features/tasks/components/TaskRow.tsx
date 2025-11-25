// src/features/tasks/components/TaskRow.tsx
import type { Task } from "../../../types/taskAndTeam"

interface TaskRowProps {
    task: Task
    assigneeName: string | null
    onView: (task: Task) => void
    onEdit: (task: Task) => void
    onDelete: (task: Task) => void
}

export function TaskRow({
                            task,
                            assigneeName,
                            onView,
                            onEdit,
                            onDelete,
                        }: TaskRowProps) {
    // small helper for days left
    const daysLeft = (() => {
        const due = new Date(task.due_at)
        const now = new Date()
        const diffMs = due.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        return diffDays
    })()

    return (
        <div
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
            {/* Left side: title + meta */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {task.title}
          </span>
                    <span
                        className={`
              inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
              ${
                            task.status === "done"
                                ? "bg-emerald-50 text-emerald-700"
                                : task.status === "in_progress"
                                    ? "bg-blue-50 text-blue-700"
                                    : task.status === "canceled"
                                        ? "bg-rose-50 text-rose-700"
                                        : "bg-slate-100 text-slate-700"
                        }
            `}
                    >
            {task.status}
          </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {assigneeName && (
                        <span>
              Assignee: <span className="font-medium text-slate-700">{assigneeName}</span>
            </span>
                    )}
                    <span>
            Due:{" "}
                        <span className="font-medium text-slate-700">
              {new Date(task.due_at).toLocaleDateString()}
            </span>
          </span>
                    <span
                        className={
                            daysLeft < 0
                                ? "text-rose-600 font-medium"
                                : daysLeft <= 2
                                    ? "text-amber-600 font-medium"
                                    : "text-emerald-600 font-medium"
                        }
                    >
            {daysLeft < 0
                ? `${Math.abs(daysLeft)} days overdue`
                : daysLeft === 0
                    ? "Due today"
                    : `${daysLeft} days left`}
          </span>
                </div>
            </div>

            {/* Right side: actions */}
            <div className="flex items-center gap-2">
                {/* View / info button */}
                <button
                    type="button"
                    onClick={() => onView(task)}
                    className="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    title="View details"
                >
                    ⓘ
                </button>

                {/* Edit button */}
                <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                    Edit
                </button>

                {/* Delete button */}
                <button
                    type="button"
                    onClick={() => onDelete(task)}
                    className="inline-flex items-center rounded-md bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}