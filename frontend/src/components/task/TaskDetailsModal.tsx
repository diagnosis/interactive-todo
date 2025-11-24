// src/components/task/TaskDetailsModal.tsx
import type { Task } from "../../types/taskAndTeam"
import { Modal } from "../ui/Modal"

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
            title="Task details"
            maxWidthClass="max-w-lg"
        >
            <div className="space-y-3 text-sm text-slate-700">
                <div>
                    <div className="text-xs font-semibold text-slate-500">
                        Title
                    </div>
                    <div>{task.title}</div>
                </div>

                {task.description && (
                    <div>
                        <div className="text-xs font-semibold text-slate-500">
                            Description
                        </div>
                        <p className="whitespace-pre-wrap">{task.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <div className="font-semibold text-slate-500">Status</div>
                        <div className="capitalize">{task.status.replace("_", " ")}</div>
                    </div>
                    <div>
                        <div className="font-semibold text-slate-500">Assignee</div>
                        <div>{assigneeName ?? "Unassigned"}</div>
                    </div>
                    <div>
                        <div className="font-semibold text-slate-500">Due at</div>
                        <div>{task.due_at ? new Date(task.due_at).toLocaleString() : "-"}</div>
                    </div>
                    <div>
                        <div className="font-semibold text-slate-500">Created</div>
                        <div>{new Date(task.created_at).toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}