
import { Zap, Brain, Lock, Target, Layout, ShieldAlert } from 'lucide-react';

const features = [
    {
        icon: <Zap size={24} />,
        title: "Instant Autofill",
        desc: "Precision injection of data into LinkedIn forms based on high-fidelity user profiles."
    },
    {
        icon: <Brain size={24} />,
        title: "AI Answer Generation",
        desc: "Context-aware logic to handle unique application questions with intelligent reasoning."
    },
    {
        icon: <Lock size={24} />,
        title: "Local Data Storage",
        desc: "Your data remains in your local environment. Encryption standard: AES-256."
    },
    {
        icon: <Target size={24} />,
        title: "Focus: Easy Apply",
        desc: "Specialized detection algorithms optimized specifically for the Easy Apply protocol."
    },
    {
        icon: <Layout size={24} />,
        title: "Smart UI Toggle",
        desc: "A minimalistic, non-intrusive interface that activates only when required."
    },
    {
        icon: <ShieldAlert size={24} />,
        title: "Zero Complexity",
        desc: "No queues. No background polling. Just pure, deterministic automation."
    }
];

export default function Features() {
    return (
        <section id="features" className="py-24 relative bg-grid">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold tracking-tight mb-4">
                        Core Capabilities
                    </h2>
                    <p className="text-lg opacity-60 max-w-2xl mx-auto font-light">
                        Engineered to eliminate friction from the application process through advanced AI logic and precision automation.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div key={index} className="glass p-8 rounded-3xl hover:border-cyan-500/30 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/5 flex items-center justify-center mb-6 text-cyan-500 group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="opacity-60 leading-relaxed font-light text-sm">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Background elements */}
        </section>
    );
}
