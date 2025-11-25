import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { taskClient } from "../../../api/taskClient"
import { teamClient } from "../../../api/teamClient"
import type { Task, TeamMember } from "../../../types/taskAndTeam"
import { TaskRow } from "./TaskRow"
import { TaskDetailsModal } from "./TaskDetailsModal"
import { CreateTaskModal } from "./CreateTaskModal"
import { EditTaskModal } from "./EditTaskModal"
import { Button } from "../../../shared/components/Button"

interface TeamTasksProps {
    teamId: string | null
}

export function TeamTasks({ teamId }: TeamTasksProps) {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [viewTask, setViewTask] = useState<Task | null>(null)
    const [editTask, setEditTask] = useState<Task | null>(null)

    const { data: tasksResp } = useQuery({
        queryKey: ["tasks", teamId],
        queryFn: () => taskClient.listTeamTasks(teamId!),
        enabled: !!teamId,
    })

    const tasks: Task[] = tasksResp?.data?.tasks ?? []

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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Select a Team</h3>
                <p className="text-slate-600">Choose a team from the sidebar to view and manage tasks</p>
            </div>
        )
    }

    return (
        <section className="flex-1 flex flex-col px-8 py-6">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tasks</h2>
                    <p className="text-sm text-slate-600 mt-1">Manage your team's tasks and assignments</p>
                </div>
                <Button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    size="md"
                >
                    + Add Task
                </Button>
            </header>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                    <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-slate-600 font-medium">No tasks yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first task to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
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
