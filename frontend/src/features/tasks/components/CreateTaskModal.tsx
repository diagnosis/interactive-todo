import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { TaskRequest, TeamMember } from "../../../types/taskAndTeam"
import { taskClient } from "../../../api/taskClient"
import { Modal } from "../../../shared/components/Modal"
import { Input } from "../../../shared/components/Input"
import { Button } from "../../../shared/components/Button"

interface CreateTaskModalProps {
    open: boolean
    onClose: () => void
    teamId: string | null
    members: TeamMember[]
}

export function CreateTaskModal({ open, onClose, teamId, members }: CreateTaskModalProps) {
    const queryClient = useQueryClient()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [assigneeId, setAssigneeId] = useState<string | "">("")

    const createMutation = useMutation({
        mutationFn: (payload: TaskRequest) => taskClient.create(payload),
        onSuccess: (res) => {
            if (res.error) {
                setError(res.error.message)
                return
            }
            setTitle("")
            setDescription("")
            setDueDate("")
            setError(null)
            queryClient.invalidateQueries({ queryKey: ["tasks", teamId] })
            onClose()
        },
        onError: () => {
            setError("Failed to create task")
        },
    })

    if (!open || !teamId) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!title.trim()) {
            setError("Title is required")
            return
        }
        if (!dueDate) {
            setError("Due date is required")
            return
        }

        createMutation.mutate({
            team_id: teamId,
            title,
            description: description || undefined,
            assignee_id: assigneeId || undefined,
            due_at: new Date(dueDate).toISOString(),
        })
    }

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title="Create New Task"
            footer={
                <>
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                        disabled={createMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        loading={createMutation.isPending}
                        type="submit"
                        onClick={handleSubmit}
                    >
                        Create Task
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
                    placeholder="e.g., Fix login bug"
                    required
                />

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            min-h-[100px] transition-colors"
                        placeholder="Optional details..."
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
                        Assignee <span className="text-slate-500 font-normal">(optional)</span>
                    </label>
                    <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            bg-white transition-colors"
                    >
                        <option value="">Unassigned (default to creator)</option>
                        {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                                {m.display_name ?? m.email}
                            </option>
                        ))}
                    </select>
                </div>
            </form>
        </Modal>
    )
}
