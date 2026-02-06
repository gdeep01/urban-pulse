'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PulseService } from '@/lib/services/pulse-service';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStatsCardProps {
    title: string;
    value: string | number;
    score: number;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    subtitle?: string;
    className?: string;
    isLoading?: boolean;
}

function getScoreColor(score: number): string {
    const status = PulseService.getPulseStatus(score);
    switch (status) {
        case 'excellent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'good': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'poor': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
}

export function LiveStatsCard({
    title,
    value,
    score,
    icon,
    trend,
    subtitle,
    className,
    isLoading,
}: LiveStatsCardProps) {
    return (
        <Card className={cn(
            'bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-xl transition-all duration-300',
            isLoading ? 'opacity-80' : 'hover:border-slate-600/50 hover:shadow-lg hover:shadow-primary/5',
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                    {title}
                </CardTitle>
                <div className="text-slate-400">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div className="space-y-1 flex-1">
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <motion.div
                                key={value}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-2xl font-bold text-white"
                            >
                                {value}
                            </motion.div>
                        )}
                        {isLoading ? (
                            <Skeleton className="h-3 w-32" />
                        ) : subtitle && (
                            <p className="text-xs text-slate-400">{subtitle}</p>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-5 w-12 rounded-full" />
                                <Skeleton className="h-3 w-16" />
                            </>
                        ) : (
                            <>
                                <Badge className={cn('text-[10px] border px-2 py-0', getScoreColor(score))}>
                                    {score}/100
                                </Badge>
                                <span className="text-[10px] text-slate-500 capitalize">
                                    {PulseService.getPulseStatus(score)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {trend && !isLoading && (
                    <div className="mt-2 flex items-center text-xs">
                        {trend === 'up' && <span className="text-emerald-400">↑ Improving</span>}
                        {trend === 'down' && <span className="text-red-400">↓ Worsening</span>}
                        {trend === 'stable' && <span className="text-slate-400">→ Stable</span>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
