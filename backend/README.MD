# Interactive TODO System – API Endpoints

This document covers all available endpoints for authentication, users, teams, and tasks.
All protected routes require a valid JWT access token sent via:

```
Authorization: Bearer <access_token>
```

---

# Authentication

### Base: `/auth`

### Public Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register a new user |
| POST | /auth/login | Login and receive access + refresh tokens |
| POST | /auth/refresh | Refresh access token (refresh-token rotation) |
| POST | /auth/logout | Logout from current device |

### Protected Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /auth/{user_id}/update-usertype | Admin updates another user’s type |
| POST | /auth/logout-all | Logout from all devices |

---

# Users

### Base: `/users` (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/ | List all users |

---

# Teams

### Base: `/teams` (Protected)

## General Team Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /teams/ | Create a new team |
| GET | /teams/mine | List teams current user belongs to |

## Team-Scoped Routes

### Base: `/teams/{team_id}`

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /teams/{team_id}/members | List members of a team |
| POST | /teams/{team_id}/members | Add a member |
| DELETE | /teams/{team_id}/members/{user_id} | Remove a member |

### Team Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /teams/{team_id}/tasks | List all tasks in the team |
| GET | /teams/{team_id}/tasks/assignee | Tasks assigned to the current user |
| GET | /teams/{team_id}/tasks/reporter | Tasks reported by the current user |

---

# Tasks

### Base: `/tasks` (Protected)

## General Task Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tasks/ | Create a new task |

## User-Scoped Views
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tasks/reporter | All tasks created by the user |
| GET | /tasks/assignee | All tasks assigned to the user |

## Single Task Operations

### Base: `/tasks/{id}`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tasks/{id}/ | Get task details |
| DELETE | /tasks/{id}/ | Delete task |
| PATCH | /tasks/{id}/assign | Assign task |
| PATCH | /tasks/{id}/status | Update status |
| PATCH | /tasks/{id}/update-details | Update title/description/due date |

---
