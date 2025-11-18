import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { taskApi } from '../api/taskApi'
import type {Task, TaskListResponse, TaskStatus} from '../types/task'
import { Modal } from '../components/Modal'
import { TaskForm } from '../components/TaskForm'

export const Route = createFileRoute('/dashboard')({
    component: DashboardPage,
})

type ViewMode = 'reporter' | 'assignee'

function DashboardPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('reporter')
    const [reassigningTask, setReassigningTask] = useState<Task | null>(null)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [updatingStatusTask, setUpdatingStatusTask] = useState<Task | null>(null)
    const queryClient = useQueryClient()

    // Fetch tasks based on view mode
    const { data, isLoading, error } = useQuery<TaskListResponse>({
        queryKey: ['tasks', viewMode],
        queryFn: viewMode === 'reporter' ? taskApi.listAsReporter : taskApi.listAsAssignee,
    })

    // Fetch counts for both tabs
    const { data: reporterData } = useQuery<TaskListResponse>({
        queryKey: ['tasks', 'reporter'],
        queryFn: taskApi.listAsReporter,
    })

    const { data: assigneeData } = useQuery<TaskListResponse>({
        queryKey: ['tasks', 'assignee'],
        queryFn: taskApi.listAsAssignee,
    })

    const deleteMutation = useMutation({
        mutationFn: taskApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
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
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
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

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">My Tasks</h1>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        + New Task
                    </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex space-x-8">
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
                    </nav>
                </div>

                {/* Task List */}
                <div className="bg-white rounded-lg shadow">
                    {!data?.tasks || data.tasks.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {viewMode === 'reporter'
                                ? 'No tasks created yet. Create your first task!'
                                : 'No tasks assigned to you yet.'}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {data.tasks.map((task) => (
                                <div key={task.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                                                <span className="text-xs text-gray-400">
                          Due: {new Date(task.due_at).toLocaleDateString()}
                        </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {viewMode === 'reporter' && (
                                                <>
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
                                                        onClick={() => handleDelete(task.id)}
                                                        disabled={deleteMutation.isPending}
                                                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {viewMode === 'assignee' && (
                                                <button
                                                    onClick={() => setUpdatingStatusTask(task)}
                                                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    Update Status
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Task"
            >
                <TaskForm onSuccess={() => setIsCreateModalOpen(false)} />
            </Modal>

            {/* Edit Task Modal */}
            <Modal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                title="Edit Task"
            >
                {editingTask && (
                    <TaskForm
                        task={editingTask}
                        mode="edit"
                        onSuccess={() => {
                            setEditingTask(null)
                            queryClient.invalidateQueries({ queryKey: ['tasks'] })
                        }}
                    />
                )}
            </Modal>

            {/* Reassign Task Modal */}
            <Modal
                isOpen={!!reassigningTask}
                onClose={() => setReassigningTask(null)}
                title="Reassign Task"
            >
                {reassigningTask && (
                    <TaskForm
                        task={reassigningTask}
                        mode="reassign"
                        onSuccess={() => {
                            setReassigningTask(null)
                            queryClient.invalidateQueries({ queryKey: ['tasks'] })
                        }}
                    />
                )}
            </Modal>

            {/* Update Status Modal */}
            <Modal
                isOpen={!!updatingStatusTask}
                onClose={() => setUpdatingStatusTask(null)}
                title="Update Task Status"
            >
                {updatingStatusTask && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Current Status: <span className="font-medium capitalize">{updatingStatusTask.status.replace('_', ' ')}</span>
                            </p>
                            <p className="text-sm font-medium text-gray-700 mb-2">Select New Status:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(['open', 'in_progress', 'done', 'canceled'] as TaskStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusUpdate(status)}
                                        disabled={updateStatusMutation.isPending || status === updatingStatusTask.status}
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
