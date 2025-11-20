export type TaskStatus = 'open' | 'in_progress' | 'done' | 'canceled'

export interface Task {
    id: string
    team_id: string
    title: string
    description: string
    reporter_id: string
    assignee_id: string
    status: TaskStatus
    due_at: string
    created_at: string
    updated_at: string
}

export interface TaskListResponse {
    userId: string
    tasks: Task[]
}