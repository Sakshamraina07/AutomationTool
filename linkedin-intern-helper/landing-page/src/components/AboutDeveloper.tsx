
'use client';
import { motion } from 'framer-motion';
import { Github, Linkedin, Globe } from 'lucide-react';
import Link from 'next/link';

export default function AboutDeveloper() {
    return (
        <section id="about" className="py-24 relative overflow-hidden ring-1 ring-white/5 mx-4 md:mx-auto max-w-5xl rounded-[3rem] mb-24 glass">
            {/* Breaking Bad / Science Thematic Floating Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Bromine (Br) */}
                <motion.div
                    animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-10 left-10 w-12 h-12 border border-cyan-500/30 flex flex-col items-center justify-center glass rounded-sm opacity-20"
                >
                    <span className="text-[10px] self-start ml-1 leading-none">35</span>
                    <span className="text-xl font-bold font-serif -mt-1">Br</span>
                </motion.div>

                {/* Barium (Ba) */}
                <motion.div
                    animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-10 right-10 w-14 h-14 border border-cyan-500/30 flex flex-col items-center justify-center glass rounded-sm opacity-20"
                >
                    <span className="text-[10px] self-start ml-1 leading-none">56</span>
                    <span className="text-2xl font-bold font-serif -mt-1">Ba</span>
                </motion.div>

                {/* Beaker Silhouette */}
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 left-3/4 text-cyan-500 opacity-10"
                >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,20H5V18H19V20M17,16H7V13L10,8H8V6H16V8H14L17,13V16M11,10V12H13V10H11Z" />
                    </svg>
                </motion.div>

                {/* Heisenberg Uncertainty Principle */}
                <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 left-[15%] text-[10px] font-mono text-cyan-500 opacity-20 tracking-widest whitespace-nowrap"
                >
                    Δp Δx ≥ ℏ / 2
                </motion.div>

                {/* Heisenberg Silhouette (Minimalist) */}
                <motion.div
                    animate={{ opacity: [0.05, 0.1, 0.05] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 grayscale opacity-5"
                >
                    <div className="w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                </motion.div>
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                    >
                        <div className="w-48 h-48 rounded-full border-2 border-cyan-500/30 p-2 relative">
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 to-black overflow-hidden flex items-center justify-center relative group">
                                {/* Fallback Initials - Visible if image fails/missing */}
                                <span className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-cyan-500 font-mono tracking-tighter z-0">SR</span>

                                <img
                                    src="/1729313452994.jpg"
                                    alt="Saksham Raina"
                                    className="w-full h-full object-cover relative z-10"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-20 pointer-events-none" />
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-black border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-mono text-cyan-500">
                            DEV_CORE_01
                        </div>
                    </motion.div>

                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-sm font-mono text-cyan-500 mb-2 uppercase tracking-[0.3em]">Built by</h2>
                        <h3 className="text-4xl font-bold mb-4">Saksham Raina</h3>
                        <p className="text-lg opacity-60 mb-8 font-light leading-relaxed">
                            Saksham Raina is a developer focused on automation, AI systems, and building intelligent productivity tools.
                            Heisenberg.ai was built to eliminate friction from job applications using precision engineering and AI logic.
                        </p>
                        <div className="flex justify-center md:justify-start gap-4">
                            <Link href="https://github.com/Sakshamraina07" target="_blank" className="p-3 glass rounded-xl hover:text-cyan-500 transition-colors">
                                <Github size={20} />
                            </Link>
                            <Link href="https://www.linkedin.com/in/this-is-saksham-raina/" target="_blank" className="p-3 glass rounded-xl hover:text-cyan-500 transition-colors">
                                <Linkedin size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
