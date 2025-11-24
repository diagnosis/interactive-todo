// src/components/task/EditTaskModal.tsx
import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { taskClient } from "../../api/taskClient"
import type {
    Task,
    PatchTaskInput,
    TaskStatus,
    TeamMember,
} from "../../types/taskAndTeam"
import { PrimaryButton } from "../ui/buttons"

interface EditTaskModalProps {
    open: boolean
    onClose: () => void
    teamId: string | null
    task: Task | null
    members: TeamMember[]
}

export function EditTaskModal({
                                  open,
                                  onClose,
                                  teamId,
                                  task,
                                  members,
                              }: EditTaskModalProps) {
    const queryClient = useQueryClient()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [status, setStatus] = useState<TaskStatus>("open")
    const [assigneeId, setAssigneeId] = useState<string>("")
    const [error, setError] = useState<string | null>(null)

    // Prefill when task changes
    useEffect(() => {
        if (!task) return

        setTitle(task.title)
        setDescription(task.description ?? "")
        setStatus(task.status)
        setDueDate(task.due_at.slice(0, 10)) // ISO → yyyy-mm-dd
        setAssigneeId(task.assignee_id ?? "")
    }, [task])

    const patchMutation = useMutation({
        mutationFn: (payload: PatchTaskInput) =>
            taskClient.patchTask(task!.id, payload),
        onSuccess: (res) => {
            if (res.error) {
                setError(res.error.message)
                return
            }
            setError(null)
        },
        onError: () => {
            setError("Failed to update task")
        },
    })

    const statusMutation = useMutation({
        mutationFn: (newStatus: TaskStatus) =>
            taskClient.updateTask(task!.id, newStatus),
        onSuccess: (res) => {
            if (res.error) {
                setError(res.error.message)
                return
            }
            queryClient.invalidateQueries({ queryKey: ["tasks", teamId] })
        },
    })

    const assignMutation = useMutation({
        mutationFn: (newAssigneeId: string | null) =>
            taskClient.assignTask(task!.id, newAssigneeId),
        onSuccess: (res) => {
            if (res.error) {
                setError(res.error.message)
                return
            }
            queryClient.invalidateQueries({ queryKey: ["tasks", teamId] })
        },
    })

    if (!open || !task || !teamId) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const payload: PatchTaskInput = {
            title,
            description: description || null,
            due_at: new Date(dueDate).toISOString(),
        }

        const originalAssignee = task.assignee_id ?? ""
        const changedAssignee = assigneeId !== originalAssignee

        // 1) update details
        patchMutation.mutate(payload, {
            onSuccess: (res) => {
                if (res.error) {
                    setError(res.error.message)
                    return
                }

                // 2) if assignee changed → call assign endpoint
                if (changedAssignee) {
                    assignMutation.mutate(
                        assigneeId || null,
                        {
                            onSuccess: (assignRes) => {
                                if (assignRes.error) {
                                    setError(assignRes.error.message)
                                    return
                                }
                                queryClient.invalidateQueries({ queryKey: ["tasks", teamId] })
                                onClose()
                            },
                        }
                    )
                } else {
                    queryClient.invalidateQueries({ queryKey: ["tasks", teamId] })
                    onClose()
                }
            },
        })
    }

    const handleStatusChange = (newStatus: TaskStatus) => {
        setStatus(newStatus)
        statusMutation.mutate(newStatus)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Edit task</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {/* Title */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                min-h-[80px]"
                        />
                    </div>

                    {/* Due date */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">
                            Due date
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">
                            Assignee
                        </label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.display_name ?? m.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status dropdown */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Status</label>
                        <select
                            value={status}
                            onChange={(e) =>
                                handleStatusChange(e.target.value as TaskStatus)
                            }
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                            <option value="canceled">Canceled</option>
                        </select>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            disabled={patchMutation.isPending || assignMutation.isPending}
                        >
                            Cancel
                        </button>

                        <PrimaryButton
                            loading={patchMutation.isPending || assignMutation.isPending}
                            className="px-4 py-2"
                            type="submit"
                        >
                            Save changes
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    )
}