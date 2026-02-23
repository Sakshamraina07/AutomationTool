
import { Download, LayoutPanelTop, Zap } from 'lucide-react';

export default function HowItWorks() {
    const steps = [
        {
            title: "Install Extension",
            desc: "Add to Chrome in seconds. Heisenberg.ai integrates seamlessly into your professional workflow.",
            icon: <Download className="text-cyan-500" size={32} />
        },
        {
            title: "Open Easy Apply",
            desc: "Navigate to any LinkedIn Easy Apply listing. Our system automatically detects valid targets.",
            icon: <LayoutPanelTop className="text-cyan-500" size={32} />
        },
        {
            title: "Heisenberg.ai Handles the Rest",
            desc: "Precision engineering fills every field with high-fidelity data. Uncertainty eliminated.",
            icon: <Zap className="text-cyan-500" size={32} />
        }
    ];

    return (
        <section id="how-it-works" className="py-24 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 tracking-tight">System Protocol</h2>
                    <p className="text-lg opacity-60">Follow the mathematical path to total efficiency.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {steps.map((step, i) => (
                        <div key={i} className="glass p-10 rounded-3xl group hover:border-cyan-500/30 transition-all duration-500">
                            <div className="mb-8 w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {step.icon}
                            </div>
                            <div className="text-xs font-mono mb-4 text-cyan-500 opacity-60">STEP_00{i + 1}</div>
                            <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                            <p className="opacity-60 leading-relaxed font-light">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subtle formula overlay */}
            <div className="absolute bottom-0 right-0 p-8 font-mono text-[100px] opacity-[0.02] pointer-events-none select-none">
                PV = nRT
            </div>

            {/* Background elements */}
        </section>
    );
}
