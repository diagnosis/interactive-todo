// src/components/dashboard/TeamTasks.tsx
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { taskClient } from "../../api/taskClient"
import type { Task, TeamMember } from "../../types/taskAndTeam"
import { TaskRow } from "../task/TaskRow"
import { TaskDetailsModal } from "../task/TaskDetailsModal"
import { CreateTaskModal } from "../task/CreateTaskModal"
import { EditTaskModal } from "../task/EditTaskModal"
import {teamClient} from "../../api/teamClient.ts";

interface TeamTasksProps {
    teamId: string | null
}

export function TeamTasks({ teamId }: TeamTasksProps) {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [viewTask, setViewTask] = useState<Task | null>(null)
    const [editTask, setEditTask] = useState<Task | null>(null)

    // tasks
    const { data: tasksResp } = useQuery({
        queryKey: ["tasks", teamId],
        queryFn: () => taskClient.listTeamTasks(teamId!),
        enabled: !!teamId,
    })

    const tasks: Task[] = tasksResp?.data?.tasks ?? []

    // team members – you already have listMembers via teamClient
    const { data: membersResp } = useQuery({
        queryKey: ["team-members", teamId],
        queryFn: () => teamClient.listMembers(teamId!),
        enabled: !!teamId,
    })

    const members: TeamMember[] = membersResp?.data?.members ?? []

    const assigneeNameMap = useMemo(() => {
        const m = new Map<string, string | null>()
        for (const mem of members) {
            m.set(mem.user_id, mem.display_name ?? mem.email)
        }
        return m
    }, [members])

    const deleteMutation = useMutation({
        mutationFn: (taskId: string) => taskClient.delete(taskId),
        onSuccess: () => {
            if (teamId) {
                queryClient.invalidateQueries({ queryKey: ["tasks", teamId] })
            }
        },
    })

    if (!teamId) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                Select a team to view tasks
            </div>
        )
    }

    return (
        <section className="flex-1 flex flex-col px-6 py-4">
            <header className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Tasks</h2>
                <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                >
                    +add task
                </button>
            </header>

            {tasks.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks yet.</p>
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            assigneeName={
                                task.assignee_id ? assigneeNameMap.get(task.assignee_id) ?? null : null
                            }
                            onView={setViewTask}
                            onEdit={setEditTask}
                            onDelete={(t) => deleteMutation.mutate(t.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <CreateTaskModal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                teamId={teamId}
                members={members}
            />

            <EditTaskModal
                open={!!editTask}
                onClose={() => setEditTask(null)}
                teamId={teamId}
                task={editTask}
                members={members}
            />

            <TaskDetailsModal
                task={viewTask}
                assigneeName={
                    viewTask?.assignee_id
                        ? assigneeNameMap.get(viewTask.assignee_id) ?? null
                        : null
                }
                onClose={() => setViewTask(null)}
            />
        </section>
    )
}