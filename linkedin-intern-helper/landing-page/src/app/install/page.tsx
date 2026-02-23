
import Link from 'next/link';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';

export default function InstallPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] bg-grid py-20 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full -z-10" />
            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <div className="glass rounded-[3rem] shadow-2xl overflow-hidden border border-white/5">
                    <div className="p-8 md:p-12 text-center border-b border-white/5">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            Heisenberg<span className="text-cyan-500">.ai</span> Installation
                        </h1>
                        <p className="text-xl opacity-60 mb-8 max-w-2xl mx-auto font-light">
                            Follow these precision steps to deploy the engine in Developer Mode.
                            (Official Chrome Store release coming soon!)
                        </p>

                        <a href="/heisenberg-ai-v1.zip" download className="inline-flex items-center gap-2 bg-cyan-500 text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                            <Download size={20} /> Download Extension v1.0
                        </a>
                    </div>

                    <div className="p-8 md:p-12 space-y-12">

                        {/* Step 1 */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center text-cyan-500 font-bold text-xl font-mono">1</div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Unzip the archive</h3>
                                <p className="opacity-60 font-light">Extract the downloaded <code className="glass px-2 py-1 rounded text-cyan-500 font-mono">heisenberg-ai-v1.zip</code> to a dedicated location.</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center text-cyan-500 font-bold text-xl font-mono">2</div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Open Chrome Extensions</h3>
                                <p className="opacity-60 font-light mb-4">Execute this command in your address bar:</p>
                                <div className="glass px-4 py-2 rounded-lg font-mono text-cyan-500 text-sm border border-cyan-500/20 inline-block shadow-inner">
                                    chrome://extensions
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center text-cyan-500 font-bold text-xl font-mono">3</div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Activate Developer Mode</h3>
                                <p className="opacity-60 font-light">Toggle the master switch in the top-right quadrant.</p>
                                <div className="mt-4 p-4 glass rounded-xl border border-cyan-500/10 flex gap-3 text-sm opacity-80">
                                    <AlertTriangle size={16} className="mt-0.5 text-cyan-500" />
                                    <span>Deployment phase: Beta. Manual activation required for initial load.</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center text-cyan-500 font-bold text-xl font-mono">4</div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Deploy Unpacked</h3>
                                <p className="opacity-60 font-light">Click "Load Unpacked" and select the source folder from Step 1.</p>
                                <div className="mt-6 flex items-center gap-2 text-cyan-500 font-bold tracking-widest uppercase text-xs">
                                    <CheckCircle size={20} />
                                    <span>System Initialized. Ready for automation.</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}
