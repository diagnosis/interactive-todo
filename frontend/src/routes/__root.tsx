import { createRootRoute, Outlet } from "@tanstack/react-router"
import {AppHeader} from "../components/layout/Appheader.tsx";
import { AppFooter } from "../components/layout/Footer.tsx";
import {AuthProvider} from "../context/AuthContext.tsx";

const RootLayout = () => {
   return (
        <AuthProvider>
            <div className="min-h-screen flex flex-col bg-slate-100">
                <AppHeader/>
                <main className="flex-1 flex flex-col">
                    <Outlet />
                </main>
                <AppFooter/>
            </div>
        </AuthProvider>
   )
}

export const Route = createRootRoute({ component: RootLayout })