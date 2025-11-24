import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute('/_auth')({
    component: AuthLayout,
})

function AuthLayout() {
    return (
        <div className="flex-1 flex items-center justify-center">
            <Outlet />
        </div>
    )
}