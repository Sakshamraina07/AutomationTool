
'use client';
import { motion } from 'framer-motion';
import { Terminal, Github, ChevronRight, Linkedin, Search, Zap, Target, BarChart3, Settings, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative pt-40 pb-24 overflow-hidden bg-grid">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center md:text-left grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full glass text-cyan-500 text-xs font-bold mb-6 border border-cyan-500/20 uppercase tracking-widest">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            Live System Status: Stable
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                            Heisenberg<span className="text-cyan-500">.ai</span> <br />
                            <span className="text-3xl md:text-5xl opacity-80">Precision job applications.</span>
                        </h1>
                        <p className="text-xl opacity-60 mb-10 max-w-xl leading-relaxed">
                            AI-powered Easy Apply automation built for serious applicants. Eliminate uncertainty and optimize your application flow with precision engineering.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/install">
                                <button className="w-full sm:w-auto px-8 py-4 bg-cyan-500 text-black rounded-xl font-bold text-lg hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95">
                                    Download Extension <ChevronRight size={20} />
                                </button>
                            </Link>
                            <Link href="https://github.com/Sakshamraina07/AutomationTool" target="_blank">
                                <button className="w-full sm:w-auto px-8 py-4 glass rounded-xl font-bold text-lg hover:bg-white/5 transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <Github size={20} /> GitHub
                                </button>
                            </Link>
                        </div>

                        <div className="mt-12 flex items-center gap-6 opacity-40 text-sm font-mono tracking-tighter">
                            <span>Δp Δx ≥ ℏ/2</span>
                            <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                            <span>v1.0.4-alpha</span>
                            <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                            <span>E = mc²</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative hidden md:block"
                    >
                        <div className="glass rounded-3xl p-8 aspect-square flex items-center justify-center relative overflow-hidden group">

                            {/* Abstract "Crystal" Geometry */}
                            <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-cyan-500/5 rotate-45 blur-sm -z-10 animate-pulse" />
                            <div className="absolute top-1/3 right-1/4 w-24 h-40 bg-cyan-500/10 -rotate-12 blur-md -z-10" />
                            <div className="absolute bottom-1/4 left-1/3 w-40 h-12 bg-cyan-500/5 skew-x-12 blur-sm -z-10" />

                            <div className="relative z-10 flex flex-col items-center mt-32">
                                {/* Central Engine Cluster */}
                                <div className="relative w-[480px] h-[480px] flex items-center justify-center scale-90 md:scale-100">
                                    {/* Central AUTOMATION Anchor */}
                                    <div className="w-44 h-44 glass border-4 border-cyan-500 rounded-[2.5rem] flex flex-col items-center justify-center pt-4 shadow-[0_0_100px_rgba(6,182,212,0.5)] z-20 bg-black/60 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
                                        <Linkedin size={52} className="text-cyan-500 mb-2 opacity-90" strokeWidth={1.5} />
                                        <span className="text-[9px] font-mono text-cyan-500 opacity-30 uppercase tracking-[0.5em] mb-1">System_Core</span>
                                        <span className="text-xl font-bold text-cyan-500 tracking-[0.2em] uppercase">Automation</span>
                                    </div>

                                    {/* Orbiting Container */}
                                    <div className="absolute inset-0 animate-spin-slow pointer-events-none">
                                        {/* Module 1: Scan (0°) */}
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight">
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <Search size={28} className="text-cyan-300 mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-bold text-cyan-300">Scan</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Finding Jobs</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 2: Optimize (45°) */}
                                        <div className="absolute top-[14%] right-[14%] z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-0.5s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <Settings size={28} className="text-cyan-300 mb-1 group-hover:rotate-90 transition-transform duration-500" />
                                                        <span className="text-xs font-bold text-cyan-300">Optimize</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Tailoring</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 3: Auto (90°) */}
                                        <div className="absolute top-1/2 right-0 -translate-y-1/2 z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-1s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <Zap size={28} className="text-cyan-300 mb-1 group-hover:scale-125 transition-transform" />
                                                        <span className="text-xs font-bold text-cyan-300">Auto</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Apply</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 4: Sync (135°) */}
                                        <div className="absolute bottom-[14%] right-[14%] z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-1.5s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <RefreshCw size={28} className="text-cyan-300 mb-1 group-hover:rotate-180 transition-transform" />
                                                        <span className="text-xs font-bold text-cyan-300">Sync</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Persistence</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 5: Match (180°) */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-2s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <Target size={28} className="text-cyan-300 mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-bold text-cyan-300">Match</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Filtering</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 6: Verify (225°) */}
                                        <div className="absolute bottom-[14%] left-[14%] z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-2.5s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <CheckCircle size={28} className="text-cyan-300 mb-1" />
                                                        <span className="text-xs font-bold text-cyan-300">Verify</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Success Rate</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 7: Track (270°) */}
                                        <div className="absolute top-1/2 left-0 -translate-y-1/2 z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-3s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <BarChart3 size={28} className="text-cyan-300 mb-1" />
                                                        <span className="text-xs font-bold text-cyan-300">Track</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Analytics</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Module 8: Schedule (315°) */}
                                        <div className="absolute top-[14%] left-[14%] z-30 pointer-events-auto">
                                            <div className="animate-spin-reverse-slow">
                                                <div className="animate-float-tight" style={{ animationDelay: '-3.5s' }}>
                                                    <div className="w-24 h-24 glass border-2 border-cyan-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] bg-black/40 hover:scale-110 transition-transform cursor-pointer group">
                                                        <Clock size={28} className="text-cyan-300 mb-1" />
                                                        <span className="text-xs font-bold text-cyan-300">Schedule</span>
                                                        <span className="text-[6px] font-mono text-cyan-300/40 uppercase">Timing</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-cyan-500/80 font-mono text-xs tracking-[0.4em] uppercase mt-20 text-center">
                                    LinkedIn Automation Engine
                                </div>

                                <div className="font-mono text-[8px] opacity-20 space-y-2 mt-8 text-center grid grid-cols-2 gap-x-12 border-t border-cyan-500/10 pt-8">
                                    <div className="space-y-1 text-right border-r border-white/5 pr-6">
                                        <p>{">"} MEM_ALLOC: 512MB</p>
                                        <p>{">"} THREAD_JOIN: OK</p>
                                        <p>{">"} SIG_V2: ACTIVE</p>
                                    </div>
                                    <div className="space-y-1 text-left pl-6">
                                        <p>{">"} BUF_SYNC: 0x4F</p>
                                        <p>{">"} CACHE_HIT: 94%</p>
                                        <p>{">"} ENCR: AES-256</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
