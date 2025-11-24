import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { taskClient } from "../../../api/taskClient"
import type {
    Task,
    PatchTaskInput,
    TaskStatus,
    TeamMember,
} from "../../../types/taskAndTeam"
import { Modal } from "../../../shared/components/Modal"
import { Input } from "../../../shared/components/Input"
import { Button } from "../../../shared/components/Button"

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

    useEffect(() => {
        if (!task) return

        setTitle(task.title)
        setDescription(task.description ?? "")
        setStatus(task.status)
        setDueDate(task.due_at.slice(0, 10))
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

        patchMutation.mutate(payload, {
            onSuccess: (res) => {
                if (res.error) {
                    setError(res.error.message)
                    return
                }

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
        <Modal
            isOpen={open}
            onClose={onClose}
            title="Edit Task"
            footer={
                <>
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                        disabled={patchMutation.isPending || assignMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        loading={patchMutation.isPending || assignMutation.isPending}
                        type="submit"
                        onClick={handleSubmit}
                    >
                        Save Changes
                    </Button>
                </>
            }
        >
            <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                    <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <Input
                    label="Title"
                    type="text"
                    value={title}
                    onChange={setTitle}
                    required
                />

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            min-h-[100px] transition-colors"
                    />
                </div>

                <Input
                    label="Due Date"
                    type="date"
                    value={dueDate}
                    onChange={setDueDate}
                    required
                />

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        Assignee
                    </label>
                    <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            bg-white transition-colors"
                    >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                                {m.display_name ?? m.email}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Status</label>
                    <select
                        value={status}
                        onChange={(e) =>
                            handleStatusChange(e.target.value as TaskStatus)
                        }
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            bg-white transition-colors"
                    >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="canceled">Canceled</option>
                    </select>
                </div>
            </form>
        </Modal>
    )
}
