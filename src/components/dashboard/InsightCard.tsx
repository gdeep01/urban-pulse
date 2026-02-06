'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InsightCardProps {
    insight: string;
    pulseStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
    className?: string;
}

const statusConfig = {
    excellent: {
        bg: 'from-emerald-500/20 to-emerald-600/10',
        border: 'border-emerald-500/30',
        icon: '🌟',
        label: 'Excellent',
    },
    good: {
        bg: 'from-green-500/20 to-green-600/10',
        border: 'border-green-500/30',
        icon: '✨',
        label: 'Good',
    },
    moderate: {
        bg: 'from-amber-500/20 to-amber-600/10',
        border: 'border-amber-500/30',
        icon: '⚡',
        label: 'Moderate',
    },
    poor: {
        bg: 'from-orange-500/20 to-orange-600/10',
        border: 'border-orange-500/30',
        icon: '⚠️',
        label: 'Poor',
    },
    critical: {
        bg: 'from-red-500/20 to-red-600/10',
        border: 'border-red-500/30',
        icon: '🚨',
        label: 'Critical',
    },
};

export function InsightCard({ insight, pulseStatus, className }: InsightCardProps) {
    const config = statusConfig[pulseStatus];

    return (
        <Card className={cn(
            'bg-gradient-to-r',
            config.bg,
            'border',
            config.border,
            'backdrop-blur-xl',
            className
        )}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                AI Insight
                            </span>
                            <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full',
                                pulseStatus === 'excellent' && 'bg-emerald-500/30 text-emerald-300',
                                pulseStatus === 'good' && 'bg-green-500/30 text-green-300',
                                pulseStatus === 'moderate' && 'bg-amber-500/30 text-amber-300',
                                pulseStatus === 'poor' && 'bg-orange-500/30 text-orange-300',
                                pulseStatus === 'critical' && 'bg-red-500/30 text-red-300',
                            )}>
                                {config.label}
                            </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                            {insight}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
