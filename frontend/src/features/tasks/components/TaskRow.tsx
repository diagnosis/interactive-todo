import type { Task } from "../../../types/taskAndTeam"

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
    const diffDays = Math.ceil(
        (due.getTime() - now.getTime()) / msPerDay,
    )

    if (Number.isNaN(diffDays)) {
        return { label: "No due date", className: "bg-slate-100 text-slate-600" }
    }

    if (diffDays < 0) {
        return {
            label: `${Math.abs(diffDays)}d overdue`,
            className: "bg-red-100 text-red-700 border-red-200",
        }
    }

    if (diffDays === 0) {
        return {
            label: "Due today",
            className: "bg-amber-100 text-amber-700 border-amber-200",
        }
    }

    return {
        label: `Due in ${diffDays}d`,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
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

    const statusConfig = {
        done: { className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Done" },
        in_progress: { className: "bg-blue-100 text-blue-700 border-blue-200", label: "In Progress" },
        canceled: { className: "bg-slate-100 text-slate-500 border-slate-200", label: "Canceled" },
        pending: { className: "bg-amber-50 text-amber-600 border-amber-200", label: "Pending" }
    }

    const status = statusConfig[task.status] || statusConfig.pending

    return (
        <div className="group flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4 text-sm hover:border-blue-300 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col gap-2 flex-1">
                <button
                    type="button"
                    onClick={() => onView(task)}
                    className="text-left font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                >
                    {task.title}
                </button>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {assigneeName && (
                        <span className="flex items-center gap-1 text-slate-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {assigneeName}
                        </span>
                    )}

                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${dueClass}`}
                    >
                        {dueLabel}
                    </span>

                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${status.className}`}
                    >
                        {status.label}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
                <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                    Edit
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(task)}
                    className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-all"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}
