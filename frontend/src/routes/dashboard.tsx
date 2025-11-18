import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { taskApi } from '../api/taskApi'
import type {TaskListResponse} from '../types/task'
import { Modal } from '../components/Modal'
import { TaskForm } from '../components/TaskForm'

export const Route = createFileRoute('/dashboard')({
    component: DashboardPage,
})

type ViewMode = 'reporter' | 'assignee'

function DashboardPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('reporter')

    // Fetch tasks based on view mode
    const { data, isLoading, error } = useQuery<TaskListResponse>({
        queryKey: ['tasks', viewMode],
        queryFn: viewMode === 'reporter' ? taskApi.listAsReporter : taskApi.listAsAssignee,
    })

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
                            Created by Me ({data?.tasks.length || 0})
                        </button>
                        <button
                            onClick={() => setViewMode('assignee')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                viewMode === 'assignee'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Assigned to Me ({data?.tasks.length || 0})
                        </button>
                    </nav>
                </div>

                {/* Task List */}
                <div className="bg-white rounded-lg shadow">
                    {data?.tasks.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {viewMode === 'reporter'
                                ? 'No tasks created yet. Create your first task!'
                                : 'No tasks assigned to you yet.'}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {data?.tasks.map((task) => (
                                <div key={task.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
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
                                                    <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                                                        Edit
                                                    </button>
                                                    <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {viewMode === 'assignee' && (
                                                <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
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
