import { createRootRoute, Outlet } from "@tanstack/react-router"
import { Header } from "../shared/components/Header"
import { AuthProvider } from "../context/AuthContext"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Footer } from "../features/tasks/components/Footer"

const queryClient = new QueryClient()

const RootLayout = () => {
    return (
        <AuthProvider>
            <QueryClientProvider client={queryClient}>
                <div className="min-h-screen flex flex-col">
                    <Header />

                    <main className="flex flex-1 overflow-hidden">
                        <Outlet />
                    </main>

                    <Footer />
                </div>
            </QueryClientProvider>
        </AuthProvider>
    )
}

export const Route = createRootRoute({ component: RootLayout })