import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '../api/taskApi'
import { authApi } from '../api/auth'
import type {Task} from '../types/task'

interface TaskFormProps {
    task?: Task
    mode?: 'create' | 'reassign' | 'edit'
    onSuccess: () => void
}

export function TaskForm({ task, mode = 'create', onSuccess }: TaskFormProps) {
    const [title, setTitle] = useState(task?.title || '')
    const [description, setDescription] = useState(task?.description || '')
    const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '')
    const [dueDate, setDueDate] = useState(
        task?.due_at ? task.due_at.split('T')[0] : ''
    )

    const queryClient = useQueryClient()
    const isReassignMode = mode === 'reassign'
    const isEditMode = mode === 'edit'

    // Fetch users for assignee dropdown
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: authApi.listUsers,
    })

    const createMutation = useMutation({
        mutationFn: () => taskApi.create({
            title,
            description,
            assignee_id: assigneeId || undefined,
            due_at: new Date(dueDate).toISOString(),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            alert('Task created!')
            onSuccess()
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to create task')
        },
    })

    const reassignMutation = useMutation({
        mutationFn: () => {
            if (!task?.id || !assigneeId) throw new Error('Task ID and assignee required')
            return taskApi.assign(task.id, assigneeId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            alert('Task reassigned successfully!')
            onSuccess()
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to reassign task')
        },
    })

    const updateMutation = useMutation({
        mutationFn: () => {
            if (!task?.id) throw new Error('Task ID required')
            return taskApi.update(task.id, {
                title,
                description,
                due_at: new Date(dueDate).toISOString(),
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            alert('Task updated successfully!')
            onSuccess()
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to update task')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (isReassignMode) {
            reassignMutation.mutate()
        } else if (isEditMode) {
            updateMutation.mutate()
        } else {
            createMutation.mutate()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!isReassignMode && !isEditMode && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>
                </>
            )}

            {isEditMode && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date *
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </>
            )}

            {isReassignMode && (
                <>
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Task:</span> {task?.title}
                        </p>
                        <p className="text-sm text-gray-500">{task?.description}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign To
                        </label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Unassigned</option>
                            {users?.map((user: any) => (
                                <option key={user.id} value={user.id}>
                                    {user.email}
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            {!isEditMode && !isReassignMode && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign To
                        </label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Unassigned</option>
                            {users?.map((user: any) => (
                                <option key={user.id} value={user.id}>
                                    {user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date *
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </>
            )}


            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    disabled={
                        isReassignMode
                            ? reassignMutation.isPending
                            : isEditMode
                            ? updateMutation.isPending
                            : createMutation.isPending
                    }
                    className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isReassignMode
                        ? (reassignMutation.isPending ? 'Reassigning...' : 'Reassign Task')
                        : isEditMode
                        ? (updateMutation.isPending ? 'Updating...' : 'Update Task')
                        : (createMutation.isPending ? 'Creating...' : 'Create Task')}
                </button>
            </div>
        </form>
    )
}