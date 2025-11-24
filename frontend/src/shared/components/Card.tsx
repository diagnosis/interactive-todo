export function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8 backdrop-blur-sm">
            {children}
        </div>
    )
}
