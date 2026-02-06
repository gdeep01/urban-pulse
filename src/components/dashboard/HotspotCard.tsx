'use client';

import { MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HotspotCardProps {
    name: string;
    congestionLevel: number;
    trend: 'up' | 'down' | 'stable';
    eta: string;
    className?: string;
}

const getStatusStyles = (level: number) => {
    if (level <= 25) return {
        bg: 'bg-traffic-low/20',
        text: 'text-traffic-low',
        barColor: 'bg-traffic-low',
        glowColor: 'var(--color-traffic-low)'
    };
    if (level <= 50) return {
        bg: 'bg-traffic-moderate/20',
        text: 'text-traffic-moderate',
        barColor: 'bg-traffic-moderate',
        glowColor: 'var(--color-traffic-moderate)'
    };
    if (level <= 75) return {
        bg: 'bg-traffic-high/20',
        text: 'text-traffic-high',
        barColor: 'bg-traffic-high',
        glowColor: 'var(--color-traffic-high)'
    };
    return {
        bg: 'bg-traffic-severe/20',
        text: 'text-traffic-severe',
        barColor: 'bg-traffic-severe',
        glowColor: 'var(--color-traffic-severe)'
    };
};

export const HotspotCard = ({ name, congestionLevel, trend, eta, className }: HotspotCardProps) => {
    const styles = getStatusStyles(congestionLevel);

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-rose-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-500';

    return (
        <div className={cn(
            "bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-xl hover:border-white/20 transition-all duration-300 group shadow-lg",
            className
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-colors duration-300", styles.bg)}>
                        <MapPin className={cn("w-4 h-4", styles.text)} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors tracking-tight">{name}</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">ETA: {eta}</p>
                    </div>
                </div>
                <div className={cn("p-1.5 rounded-full bg-white/5", trendColor)}>
                    <TrendIcon className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tighter">
                    <span className="text-slate-500">Congestion Intensity</span>
                    <span className={cn(styles.text)}>{congestionLevel}%</span>
                </div>

                <div className="relative">
                    {/* Background track */}
                    <div className="h-2.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5 relative">
                        {/* Animated fill */}
                        <div
                            className={cn("h-full rounded-full transition-all duration-1000 ease-out relative", styles.barColor)}
                            style={{
                                width: `${Math.max(congestionLevel, 5)}%`,
                                boxShadow: `0 0 20px ${styles.glowColor}`,
                            }}
                        >
                            {/* Shimmer effect */}
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"
                                style={{ backgroundSize: '200% 100%' }}
                            />
                        </div>
                    </div>

                    {/* Glow effect under bar (Secondary Layer) */}
                    <div
                        className="absolute -bottom-1.5 left-0 h-3 rounded-full blur-md opacity-20 transition-all duration-1000"
                        style={{
                            width: `${Math.max(congestionLevel, 5)}%`,
                            background: styles.glowColor,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
