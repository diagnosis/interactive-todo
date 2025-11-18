import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import {QueryClient, QueryClientProvider,} from '@tanstack/react-query'

import { routeTree } from './routeTree.gen'
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";
import "./index.css"

const router = createRouter({ routeTree })
const queryClient = new QueryClient()

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
                <ReactQueryDevtools initialIsOpen={false} />
                <TanStackRouterDevtools router={router} />
            </QueryClientProvider>

        </StrictMode>,
    )
}