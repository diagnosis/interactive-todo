export const AppFooter = () => {
    const year = new Date().getFullYear()

    return (
        <footer className="h-10 border-t border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-center">
      <span className="px-4">
        © {year} Interactive Todo · Built with Go & React
      </span>
        </footer>
    )
}