import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles,
    Code2,
    Users,
    Zap,
    Github,
    Brain,
    ArrowRight,
    Check,
    Play
} from 'lucide-react';
import { cn } from '../lib/utils';
import Spline from '@splinetool/react-spline';

export default function LandingPage() {
    const navigate = useNavigate();
    const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

    const features = [
        {
            icon: <Code2 size={24} />,
            title: "Multi-File Workspace",
            description: "Real-time collaborative editing across unlimited files with Monaco editor",
            color: "from-blue-500 to-cyan-500"
        },
        {
            icon: <Users size={24} />,
            title: "Video Huddles",
            description: "Built-in WebRTC video calls—code and talk without leaving your workspace",
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: <Brain size={24} />,
            title: "Autonomous AI Engineer",
            description: "AI that sees your entire codebase and suggests intelligent multi-file refactors",
            color: "from-indigo-500 to-purple-500"
        },
        {
            icon: <Github size={24} />,
            title: "GitHub Integration",
            description: "Import repos with one click and sync changes back to GitHub seamlessly",
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: <Play size={24} />,
            title: "Live Preview Engine",
            description: "Intelligent bundler that renders HTML/CSS/JS in real-time as you type",
            color: "from-orange-500 to-red-500"
        },
        {
            icon: <Zap size={24} />,
            title: "Lightning Fast",
            description: "Built on Liveblocks for sub-100ms sync and Vite for instant hot reload",
            color: "from-yellow-500 to-orange-500"
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Spline 3D Background */}
            <div className="fixed inset-0 z-0">
                <Spline
                    scene="https://prod.spline.design/oaO0dZCmRRnLDTc8/scene.splinecode"
                    className="w-full h-full"
                />
            </div>

            {/* Overlay for better text readability */}
            <div className="fixed inset-0 bg-black/30 z-[1]" />

            {/* Hero Section */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-32">
                <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 apple-glass rounded-full border-white/10 mb-6 animate-apple-fade-in">
                        <Sparkles size={16} className="text-indigo-400" />
                        <span className="text-sm font-bold text-white/60">The Future of Collaborative Development</span>
                    </div>

                    <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent leading-tight animate-apple-fade-in [animation-delay:0.1s]">
                        Code Together,
                        <br />
                        Ship Faster
                    </h1>

                    <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto leading-relaxed font-medium animate-apple-fade-in [animation-delay:0.2s]">
                        A real-time collaborative workspace with AI superpowers, video huddles, and instant preview.
                        <span className="text-indigo-400 font-bold"> The only IDE you'll ever need.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-apple-fade-in [animation-delay:0.3s]">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-apple"
                        >
                            Start Building Free
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-8 py-4 apple-glass border-white/10 rounded-2xl font-bold text-lg hover:bg-white/5 transition-apple"
                        >
                            Watch Demo
                        </button>
                    </div>

                    <p className="text-sm text-white/30 pt-4 animate-apple-fade-in [animation-delay:0.4s]">
                        No credit card required • Unlimited collaborators • Deploy in seconds
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="relative z-10 py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                            Everything you need.
                            <br />
                            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                Nothing you don't.
                            </span>
                        </h2>
                        <p className="text-xl text-white/60 max-w-2xl mx-auto">
                            Built for teams who ship fast. From solo developers to enterprise teams.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                onMouseEnter={() => setHoveredFeature(idx)}
                                onMouseLeave={() => setHoveredFeature(null)}
                                className={cn(
                                    "group relative p-8 apple-glass rounded-3xl border-white/10 transition-all duration-500",
                                    hoveredFeature === idx && "scale-105 shadow-2xl"
                                )}
                            >
                                <div className={cn(
                                    "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
                                    `bg-gradient-to-br ${feature.color}`
                                )} />

                                <div className="relative z-10">
                                    <div className={cn(
                                        "h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg",
                                        feature.color
                                    )}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-2xl font-black mb-3 tracking-tight">{feature.title}</h3>
                                    <p className="text-white/60 leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="relative z-10 py-32 px-6 bg-white/[0.02]">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-16">
                        Trusted by developers worldwide
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { stat: "10K+", label: "Active Developers" },
                            { stat: "1M+", label: "Lines of Code" },
                            { stat: "99.9%", label: "Uptime SLA" }
                        ].map((item, idx) => (
                            <div key={idx} className="p-8 apple-glass rounded-3xl border-white/10">
                                <div className="text-5xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                    {item.stat}
                                </div>
                                <div className="text-white/60 font-medium">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="relative z-10 py-32 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                            Simple, transparent pricing
                        </h2>
                        <p className="text-xl text-white/60">Start free. Scale when you're ready.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: "Free",
                                price: "$0",
                                features: ["Unlimited rooms", "5 collaborators", "Basic AI features", "Community support"]
                            },
                            {
                                name: "Pro",
                                price: "$29",
                                features: ["Everything in Free", "Unlimited collaborators", "Advanced AI", "Priority support", "GitHub sync"],
                                popular: true
                            },
                            {
                                name: "Enterprise",
                                price: "Custom",
                                features: ["Everything in Pro", "SSO & SAML", "Audit logs", "Dedicated support", "Custom deployment"]
                            }
                        ].map((plan, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "relative p-8 rounded-3xl border transition-all",
                                    plan.popular
                                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 border-transparent scale-105 shadow-2xl shadow-indigo-500/50"
                                        : "apple-glass border-white/10"
                                )}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-500 text-black text-xs font-black uppercase rounded-full">
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                                <div className="text-5xl font-black mb-6">
                                    {plan.price}
                                    {plan.price !== "Custom" && <span className="text-lg text-white/60">/month</span>}
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <Check size={20} className="text-green-400 flex-shrink-0" />
                                            <span className="text-white/80">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className={cn(
                                        "w-full py-3 rounded-xl font-bold transition-apple",
                                        plan.popular
                                            ? "bg-white text-indigo-600 hover:bg-white/90"
                                            : "bg-white/10 hover:bg-white/20"
                                    )}
                                >
                                    Get Started
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 py-32 px-6">
                <div className="max-w-4xl mx-auto text-center apple-glass-heavy rounded-[3rem] p-16 border-white/10">
                    <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                        Ready to ship faster?
                    </h2>
                    <p className="text-xl text-white/60 mb-10">
                        Join thousands of developers building the future with CollabCodeHub.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-xl flex items-center gap-3 mx-auto shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-apple"
                    >
                        Start Building Free
                        <ArrowRight size={24} />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto text-center text-white/40 text-sm">
                    <p>© 2026 CollabCodeHub. Built with ❤️ for developers.</p>
                </div>
            </footer>
        </div>
    );
}
