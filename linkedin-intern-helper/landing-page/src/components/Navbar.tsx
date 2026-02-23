
import Link from 'next/link';
import { Terminal, Github } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                <div className="glass rounded-2xl flex justify-between items-center h-16 px-6 shadow-2xl shadow-cyan-500/10">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center">
                            <Terminal size={18} className="text-black" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            Heisenberg<span className="text-cyan-500">.ai</span>
                        </span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="#how-it-works" className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity">How it Works</Link>
                        <Link href="#features" className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity">Features</Link>
                        <Link href="#about" className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity">Developer</Link>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Link href="https://github.com/Sakshamraina07/AutomationTool" target="_blank" className="opacity-70 hover:opacity-100 transition-opacity">
                            <Github size={20} />
                        </Link>
                        <Link href="/install">
                            <button className="bg-cyan-500 text-black px-5 py-2 rounded-lg font-bold text-sm hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                                Download Extension
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
