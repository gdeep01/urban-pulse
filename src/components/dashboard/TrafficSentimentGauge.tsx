'use client';

import { useEffect, useState } from 'react';

interface TrafficSentimentGaugeProps {
    score: number; // 0-100
    label: string;
}

const getTrafficColor = (score: number) => {
    // Using the global PALETTE style (HSL)
    if (score <= 25) return { color: 'hsl(142, 76%, 46%)', label: 'Smooth' };
    if (score <= 50) return { color: 'hsl(45, 93%, 58%)', label: 'Moderate' };
    if (score <= 75) return { color: 'hsl(0, 84%, 60%)', label: 'Heavy' };
    return { color: 'hsl(0, 72%, 45%)', label: 'Severe' };
};

export const TrafficSentimentGauge = ({ score, label }: TrafficSentimentGaugeProps) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    const { color, label: statusLabel } = getTrafficColor(score);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedScore(score), 100);
        return () => clearTimeout(timer);
    }, [score]);

    const circumference = 2 * Math.PI * 90;
    // Stroke offset logic for a 3/4 gauge (270 degrees)
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference * 0.75;

    return (
        <div className="relative flex flex-col items-center">
            <svg width="220" height="180" viewBox="0 0 220 200" className="transform -rotate-[135deg]">
                {/* Background arc */}
                <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * 0.25}
                />
                {/* Animated progress arc */}
                <circle
                    cx="110"
                    cy="110"
                    r="90"
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 10px ${color})`,
                    }}
                />
            </svg>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3 text-center">
                <div
                    className="text-5xl font-bold font-mono transition-all duration-500"
                    style={{ color }}
                >
                    {animatedScore}
                </div>
                <div className="text-sm text-slate-400 mt-1 font-medium tracking-wide uppercase">{label}</div>
                <div
                    className="text-sm font-black mt-3 px-4 py-1.5 rounded-full border border-white/10 uppercase tracking-widest bg-slate-900/40 backdrop-blur-md"
                    style={{
                        color
                    }}
                >
                    {statusLabel}
                </div>
            </div>
        </div>
    );
};
