import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { teamApi } from '../api/teamApi'
import { taskApi } from '../api/taskApi'
import type { Task, TaskStatus } from '../types/task'
import { Modal } from '../components/Modal'
import { TaskForm } from '../components/TaskForm'

export const Route = createFileRoute('/teams/$teamId/tasks')({
    component: TeamTasksPage,
})

type ViewMode = 'all' | 'assignee' | 'reporter'

function TeamTasksPage() {
    const { teamId } = Route.useParams()
    const [viewMode, setViewMode] = useState<ViewMode>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [reassigningTask, setReassigningTask] = useState<Task | null>(null)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [updatingStatusTask, setUpdatingStatusTask] = useState<Task | null>(null)
    const queryClient = useQueryClient()

    const { data: teamData } = useQuery({
        queryKey: ['teams'],
        queryFn: teamApi.listMyTeams,
    })

    const team = teamData?.teams?.find((t) => t.id === teamId)

    const { data, isLoading, error } = useQuery({
        queryKey: ['team-tasks', teamId, viewMode],
        queryFn: () => {
            switch (viewMode) {
                case 'assignee':
                    return teamApi.listAssigneeTasksInTeam(teamId)
                case 'reporter':
                    return teamApi.listReporterTasksInTeam(teamId)
                default:
                    return teamApi.listTeamTasks(teamId)
            }
        },
    })

    const { data: allData } = useQuery({
        queryKey: ['team-tasks', teamId, 'all'],
        queryFn: () => teamApi.listTeamTasks(teamId),
    })

    const { data: assigneeData } = useQuery({
        queryKey: ['team-tasks', teamId, 'assignee'],
        queryFn: () => teamApi.listAssigneeTasksInTeam(teamId),
    })

    const { data: reporterData } = useQuery({
        queryKey: ['team-tasks', teamId, 'reporter'],
        queryFn: () => teamApi.listReporterTasksInTeam(teamId),
    })

    const deleteMutation = useMutation({
        mutationFn: taskApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-tasks', teamId] })
            alert('Task deleted successfully')
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to delete task')
        },
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
            taskApi.updateStatus(taskId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-tasks', teamId] })
            setUpdatingStatusTask(null)
            alert('Status updated successfully')
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to update status')
        },
    })

    const handleDelete = (taskId: string) => {
        if (confirm('Are you sure you want to delete this task?')) {
            deleteMutation.mutate(taskId)
        }
    }

    const handleStatusUpdate = (status: TaskStatus) => {
        if (updatingStatusTask) {
            updateStatusMutation.mutate({ taskId: updatingStatusTask.id, status })
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">Error loading tasks</div>
            </div>
        )
    }

    const tasks = data?.tasks || []

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Link to="/teams" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
                            ← Back to Teams
                        </Link>
                        <h1 className="text-3xl font-bold">{team?.name || 'Team'} Tasks</h1>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        + New Task
                    </button>
                </div>

                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex space-x-8">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                viewMode === 'all'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            All Tasks ({allData?.tasks?.length || 0})
                        </button>
                        <button
                            onClick={() => setViewMode('assignee')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                viewMode === 'assignee'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Assigned to Me ({assigneeData?.tasks?.length || 0})
                        </button>
                        <button
                            onClick={() => setViewMode('reporter')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                viewMode === 'reporter'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Created by Me ({reporterData?.tasks?.length || 0})
                        </button>
                    </nav>
                </div>

                <div className="bg-white rounded-lg shadow">
                    {tasks.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {viewMode === 'all'
                                ? 'No tasks in this team yet. Create your first task!'
                                : viewMode === 'reporter'
                                ? 'You have not created any tasks in this team yet.'
                                : 'No tasks assigned to you in this team yet.'}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {tasks.map((task) => (
                                <div key={task.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(
                                                        task.status
                                                    )}`}
                                                >
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Due: {new Date(task.due_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingTask(task)}
                                                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setReassigningTask(task)}
                                                className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                                            >
                                                Reassign
                                            </button>
                                            <button
                                                onClick={() => setUpdatingStatusTask(task)}
                                                className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded"
                                            >
                                                Status
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                disabled={deleteMutation.isPending}
                                                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Task"
            >
                <TaskForm
                    teamId={teamId}
                    onSuccess={() => {
                        setIsCreateModalOpen(false)
                        queryClient.invalidateQueries({ queryKey: ['team-tasks', teamId] })
                    }}
                />
            </Modal>

            <Modal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                title="Edit Task"
            >
                {editingTask && (
                    <TaskForm
                        task={editingTask}
                        teamId={teamId}
                        mode="edit"
                        onSuccess={() => {
                            setEditingTask(null)
                            queryClient.invalidateQueries({ queryKey: ['team-tasks', teamId] })
                        }}
                    />
                )}
            </Modal>

            <Modal
                isOpen={!!reassigningTask}
                onClose={() => setReassigningTask(null)}
                title="Reassign Task"
            >
                {reassigningTask && (
                    <TaskForm
                        task={reassigningTask}
                        teamId={teamId}
                        mode="reassign"
                        onSuccess={() => {
                            setReassigningTask(null)
                            queryClient.invalidateQueries({ queryKey: ['team-tasks', teamId] })
                        }}
                    />
                )}
            </Modal>

            <Modal
                isOpen={!!updatingStatusTask}
                onClose={() => setUpdatingStatusTask(null)}
                title="Update Task Status"
            >
                {updatingStatusTask && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Current Status:{' '}
                                <span className="font-medium capitalize">
                                    {updatingStatusTask.status.replace('_', ' ')}
                                </span>
                            </p>
                            <p className="text-sm font-medium text-gray-700 mb-2">Select New Status:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(['open', 'in_progress', 'done', 'canceled'] as TaskStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusUpdate(status)}
                                        disabled={
                                            updateStatusMutation.isPending || status === updatingStatusTask.status
                                        }
                                        className={`px-4 py-2 rounded text-sm font-medium capitalize transition-colors ${
                                            status === updatingStatusTask.status
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50'
                                        }`}
                                    >
                                        {status.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

function getStatusColor(status: string) {
    switch (status) {
        case 'open':
            return 'bg-blue-100 text-blue-800'
        case 'in_progress':
            return 'bg-yellow-100 text-yellow-800'
        case 'done':
            return 'bg-green-100 text-green-800'
        case 'canceled':
            return 'bg-gray-100 text-gray-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}
