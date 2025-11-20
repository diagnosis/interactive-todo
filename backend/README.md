# Backend API - Team Task Management System

A robust Go-based REST API for a team-based task management application with JWT authentication, team collaboration features, and comprehensive task management capabilities.

## Overview

This is a production-ready backend service built with Go that provides a complete task management system with team collaboration features. Users can create teams, invite members, assign tasks to team members, and track task progress.

## Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Chi Router
- **Database**: PostgreSQL with pgx/v5 driver
- **Authentication**: JWT (Access + Refresh tokens)
- **Password Security**: Argon2id hashing
- **Migrations**: Goose
- **Environment Management**: godotenv

## Architecture

The backend follows clean architecture principles with clear separation of concerns:

```
backend/
├── cmd/
│   └── api/         # Application entrypoint
├── internal/
│   ├── app/         # Application initialization and dependency injection
│   ├── apperror/    # Centralized error handling
│   ├── auth/        # JWT token management
│   ├── handler/     # HTTP handlers (auth, tasks, teams)
│   ├── helper/      # Response helpers and utilities
│   ├── logger/      # Structured logging
│   ├── middleware/  # Auth, CORS, logging middleware
│   ├── routes/      # Route definitions
│   ├── secure/      # Password hashing
│   └── store/       # Data persistence layer
│       ├── database/    # Database connection pool
│       ├── refresh_tokens/  # Refresh token storage
│       ├── tasks/          # Task storage
│       ├── teams/          # Team storage
│       └── users/          # User storage
└── migrations/      # Database migrations
```

## Key Features

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Access token: 15-minute expiry
- Refresh token: 7-day expiry with device tracking
- Secure password hashing using Argon2id
- User types: Regular, Task Manager, Admin
- IP address tracking for security

### Team Management
- Create teams (Admin/Task Manager only)
- Add/remove team members
- Team roles: Owner, Admin, Member
- List all teams a user belongs to
- View team members
- Permission-based access control

### Task Management
- Create tasks within teams
- Assign tasks to team members only
- Task status tracking: Open, In Progress, Done, Canceled
- Task filtering by assignee/reporter
- Team-scoped task views
- Update task details (title, description, due date)
- Task reminders system
- Due date validation

### Security Features
- CORS middleware with configurable origins
- Request ID tracking
- Real IP detection
- Timeout middleware (60s)
- Panic recovery
- Structured logging with context

## API Endpoints

### Authentication
```
POST   /auth/register              # Create new user account
POST   /auth/login                 # Login and receive tokens
POST   /auth/refresh               # Refresh access token
POST   /auth/logout                # Logout from current device
POST   /auth/logout-all            # Logout from all devices (protected)
PATCH  /auth/{user_id}/update-usertype  # Update user type (protected)
```

### Users
```
GET    /users                      # List all users (protected)
```

### Teams
```
POST   /teams                      # Create team (Admin/Task Manager only)
GET    /teams/mine                 # List current user's teams
GET    /teams/{team_id}/members    # List team members
POST   /teams/{team_id}/members    # Add member to team (Owner/Admin only)
DELETE /teams/{team_id}/members/{user_id}  # Remove member from team (Owner/Admin only)
GET    /teams/{team_id}/tasks      # List all tasks in team
GET    /teams/{team_id}/tasks/assignee   # List tasks assigned to current user in team
GET    /teams/{team_id}/tasks/reporter   # List tasks created by current user in team
```

### Tasks
```
POST   /tasks                      # Create task (must specify team_id)
GET    /tasks/reporter             # List all tasks created by current user
GET    /tasks/assignee             # List all tasks assigned to current user
GET    /tasks/{id}                 # Get task details
DELETE /tasks/{id}                 # Delete task (creator only)
PATCH  /tasks/{id}/assign          # Assign task to team member (creator only)
PATCH  /tasks/{id}/status          # Update task status (assignee only)
PATCH  /tasks/{id}/update-details  # Update title, description, due_at (creator only)
```

### Health Check
```
GET    /health                     # Server health check
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Application
APP_ENV=development
PORT=8080

# Database
DATABASE_URL_DEV=postgres://user:password@localhost:5432/taskdb?sslmode=disable
DATABASE_URL_PROD=postgres://user:password@host:5432/taskdb?sslmode=require

# JWT Secrets (use strong random strings)
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

## Setup and Installation

### Prerequisites
- Go 1.21 or higher
- PostgreSQL 14+
- Make (optional)

### Installation Steps

1. **Clone the repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
go mod download
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start PostgreSQL**
```bash
# Using Docker
docker run --name taskdb -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14
```

5. **Run the application**
```bash
# Development mode
go run cmd/api/main.go

# Build and run
go build -o bin/api cmd/api/main.go
./bin/api
```

The server will start on `http://localhost:8080` (or your configured PORT).

## Database Migrations

Migrations run automatically on application startup. The migration files are located in `migrations/`:

- `0001_users.sql` - User accounts table
- `0002_auth_refresh_tokens.sql` - Refresh tokens for auth
- `0003_tasks.sql` - Tasks table (initial)
- `0004_tasks_entensions.sql` - Task extensions (reminders, etc.)
- `0005_team_tables.sql` - Teams and team_members tables
- `0006_alter_task_to_assign_user_to_team.sql` - Link tasks to teams
- `0007_alter_tasks.sql` - Task improvements
- `0008_alter_teams_unique_name.sql` - Team name uniqueness

## Data Models

### User
```go
type User struct {
    ID           uuid.UUID
    Email        string
    PasswordHash string
    UserType     UserType  // "regular", "task_manager", "admin"
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

### Team
```go
type Team struct {
    ID        uuid.UUID
    Name      string
    OwnerID   uuid.UUID
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### TeamMember
```go
type TeamMember struct {
    TeamID    uuid.UUID
    UserID    uuid.UUID
    Role      TeamRole  // "owner", "admin", "member"
    CreatedAt time.Time
}
```

### Task
```go
type Task struct {
    ID             uuid.UUID
    TeamID         uuid.UUID
    Title          string
    Description    *string
    ReporterID     uuid.UUID  // Task creator
    AssigneeID     uuid.UUID  // Task assignee
    DueAt          time.Time
    ReminderSentAt *time.Time
    Status         TaskStatus  // "open", "in_progress", "done", "canceled"
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```

## Business Rules

### Teams
- Only Admin or Task Manager users can create teams
- Team creator becomes the Owner
- Owners and Admins can add/remove members
- Team names must be unique
- Users must be team members to view team tasks

### Tasks
- Tasks must belong to a team
- Only team members can create tasks in a team
- Task creator is the Reporter
- Tasks can only be assigned to team members
- Only the Reporter can assign/reassign tasks
- Only the Assignee can update task status
- Only the Reporter can update task details or delete tasks
- Due dates must be at least 8 hours in the future

### Authentication
- Email addresses must be unique
- Passwords are hashed with Argon2id
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Refresh tokens are tied to user and device (IP + User Agent)

## Error Handling

The API uses consistent error responses:

```json
{
  "error": {
    "type": "validation_error",
    "message": "Invalid request parameters",
    "details": "title length must be between 1 and 100"
  }
}
```

Error types:
- `unauthorized` (401)
- `forbidden` (403)
- `not_found` (404)
- `conflict` (409)
- `validation_error` (400)
- `internal_error` (500)

## Testing

The project includes comprehensive API tests using Playwright:

```bash
cd tests/api-test
npm install
npm test
```

Test coverage includes:
- Authentication flows
- Team management
- Task CRUD operations
- Permission checks
- Error cases

## Security Considerations

- All passwords are hashed with Argon2id
- JWT secrets should be strong random strings (256-bit minimum)
- CORS is enabled - configure allowed origins for production
- Request timeouts prevent resource exhaustion
- Database prepared statements prevent SQL injection
- Input validation on all endpoints
- IP tracking for security monitoring

## Production Deployment

### Environment Configuration
```env
APP_ENV=production
PORT=8080
DATABASE_URL_PROD=postgres://user:password@prod-host:5432/taskdb?sslmode=require
JWT_ACCESS_SECRET=<strong-random-string>
JWT_REFRESH_SECRET=<strong-random-string>
```

### Build
```bash
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/api/main.go
```

### Docker
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 go build -o main cmd/api/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

### Graceful Shutdown
The server handles SIGINT and SIGTERM signals for graceful shutdown with a 30-second timeout.

## Performance Notes

- Connection pooling enabled via pgxpool
- Read/Write timeouts: 15s
- Idle timeout: 60s
- Request timeout: 60s
- Database queries use prepared statements
- Indexes on foreign keys and commonly queried fields

## Contributing

When contributing to the backend:

1. Follow Go best practices and conventions
2. Maintain clean architecture separation
3. Add tests for new features
4. Update migrations for schema changes
5. Document API changes
6. Use structured logging
7. Handle errors consistently

## License

[Your License Here]

## Support

For issues or questions, please open an issue in the GitHub repository.
