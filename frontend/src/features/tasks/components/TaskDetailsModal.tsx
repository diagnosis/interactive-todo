import type { Task } from "../../../types/taskAndTeam"
import { Modal } from "../../../shared/components/Modal"

interface TaskDetailsModalProps {
    task: Task | null
    assigneeName?: string | null
    onClose: () => void
}

export function TaskDetailsModal({
    task,
    assigneeName,
    onClose,
}: TaskDetailsModalProps) {
    if (!task) return null

    return (
        <Modal
            isOpen={!!task}
            onClose={onClose}
            title="Task Details"
            maxWidthClass="max-w-lg"
        >
            <div className="space-y-4 text-sm">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                        Title
                    </div>
                    <div className="text-base font-semibold text-slate-800">{task.title}</div>
                </div>

                {task.description && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                            Description
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{task.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Status</div>
                        <div className="capitalize font-semibold text-slate-800">{task.status.replace("_", " ")}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Assignee</div>
                        <div className="font-semibold text-slate-800">{assigneeName ?? "Unassigned"}</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Due Date</div>
                        <div className="text-slate-800 font-semibold">
                            {task.due_at ? new Date(task.due_at).toLocaleString() : "-"}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Created</div>
                        <div className="text-slate-800 font-semibold">
                            {new Date(task.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
