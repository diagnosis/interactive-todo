

export function Footer() {
    const year = new Date().getFullYear()

    return (
        <footer className="border-t border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <span>© {year} Interactive Todo</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">
            Built with <span className="font-medium text-slate-700">Go</span> &{' '}
                        <span className="font-medium text-slate-700">React</span>
          </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <a
                        href="https://safadev.app"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-slate-700"
                    >
                        safadev.app
                    </a>

                    <span className="hidden sm:inline text-slate-300">|</span>

                    <a
                        href="https://interactive-todo.safadev.app"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-slate-700"
                    >
                        Live demo
                    </a>

                    {/* If you add GitHub later, just fill the href */}
                    <a
                        href="https://github.com/your-user/interactive-todo"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-slate-700"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    )
}