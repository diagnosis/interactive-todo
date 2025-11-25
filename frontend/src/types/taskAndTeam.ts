export type TaskStatus = "open" | "in_progress" | "done" | "canceled"

export interface Task {
    id: string
    team_id: string
    title: string
    description?: string
    reporter_id: string
    assignee_id: string
    due_at: string
    reminder_sent_at?: string | null
    status: TaskStatus
    created_at: string
    updated_at: string
}

export interface TaskListResponse {
    user_id: string
    team_id: string
    tasks: Task[]
}

export interface TaskRequest {
    team_id: string
    title: string
    description?: string
    assignee_id?: string
    due_at: string
}
export interface PatchTaskInput {
    title?: string | null
    description?: string | null
    due_at?: string | null
    assignee_id?: string | null
}
export type TeamRole = "owner" | "admin" | "member"
export interface Team{
    id: string
    name: string
    owner_id: string
    created_at: string
    updated_at:string
}
export interface TeamList{
    user_id: string
    teams: Team[]
}
export interface TeamMember {
    team_id: string
    user_id: string
    email: string
    display_name?: string | null
    role: TeamRole
    created_at: string
}
export interface MemberList{
    team_id: string
    members: TeamMember[]
}
export interface TeamMemberRequest{
    team_id: string
    user_id: string
    role : TeamRole
}
export interface RemovedMemberResponse{
    message:string
    team_id:string
    user_id:string
}