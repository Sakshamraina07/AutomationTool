
export default function Footer() {
    return (
        <footer className="py-12 relative border-t border-white/5 glass">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <span className="text-xl font-bold">
                            Heisenberg<span className="text-cyan-500">.ai</span>
                        </span>
                        <p className="text-sm opacity-40 mt-2 font-mono italic">“Uncertainty eliminated.”</p>
                    </div>

                    <div className="flex gap-8 text-sm font-light opacity-60">
                        <p>© 2026 Saksham Raina</p>
                        <p className="hover:text-cyan-500 transition-all cursor-pointer">Security Protocol</p>
                        <p className="hover:text-cyan-500 transition-all cursor-pointer">Local Logs</p>
                    </div>
                </div>
            </div>

            {/* Background text decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-[150px] font-bold select-none pointer-events-none whitespace-nowrap -z-10">
                HEISENBERG.AI
            </div>
        </footer>
    );
}
