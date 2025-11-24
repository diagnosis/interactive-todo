import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import type {TaskRequest, TeamMember} from "../../types/taskAndTeam.ts";
import {taskClient} from "../../api/taskClient.ts";
import { PrimaryButton } from "../ui/buttons.tsx";

interface CreateTaskModalProps {
    open: boolean
    onClose: () => void
    teamId: string | null
    members: TeamMember[]
}

export function CreateTaskModal({ open, onClose, teamId, members }: CreateTaskModalProps) {
    const queryClient = useQueryClient()

    // form state
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
            // clear form
            setTitle("")
            setDescription("")
            setDueDate("")
            setError(null)
            // refetch tasks for that team
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
            assignee_id: assigneeId || undefined, //
            due_at: new Date(dueDate).toISOString(),
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Create new task</h2>
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
                            placeholder="Fix login bug"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         min-h-[80px]"
                            placeholder="Optional details..."
                        />
                    </div>

                    {/* Due date */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Due date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Assignee (optional)</label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Unassigned (default to creator)</option>
                            {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.display_name ?? m.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </button>

                        <PrimaryButton
                            loading={createMutation.isPending}
                            type={"submit"}
                            className="px-4 py-2"
                        >
                            Create task
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    )
}