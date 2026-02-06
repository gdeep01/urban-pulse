'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeocodingResult } from '@/lib/types';
import { PulseService } from '@/lib/services/pulse-service';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

interface CityRanking {
    cityId: string;
    name: string;
    lat: number;
    lng: number;
    pulse: number;
    status: string;
    trend: 'improving' | 'declining' | 'stable';
}

interface Props {
    onCitySelect: (city: { name: string; lat: number; lng: number }) => void;
}

export function CityRankingCard({ onCitySelect }: Props) {
    const { data: rankings, isLoading } = useQuery<CityRanking[]>({
        queryKey: ['rankings'],
        queryFn: async () => {
            const res = await fetch('/api/cities/rankings');
            if (!res.ok) throw new Error('Failed to fetch rankings');
            return res.json();
        }
    });

    if (isLoading || !rankings || rankings.length === 0) return null;

    return (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader className="py-3 px-4 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Live City Rankings
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
                <ul className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <AnimatePresence>
                        {rankings.map((city, index) => (
                            <motion.li
                                key={city.cityId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onCitySelect({ name: city.name, lat: city.lat, lng: city.lng })}
                                className={cn(
                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-800/80 group",
                                    index === 0 && "bg-emerald-500/10 border border-emerald-500/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "text-xs font-mono w-4 text-center",
                                        index < 3 ? "text-slate-200 font-bold" : "text-slate-500"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <div>
                                        <div className="text-sm font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">
                                            {city.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
                                            {PulseService.getPulseStatus(city.pulse)}
                                            {city.trend === 'improving' ? <TrendingUp size={10} className="text-emerald-500" /> :
                                                city.trend === 'declining' ? <TrendingDown size={10} className="text-red-500" /> :
                                                    <Minus size={10} className="text-slate-600" />}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "text-sm font-bold",
                                        city.pulse >= 75 ? "text-emerald-400" :
                                            city.pulse >= 50 ? "text-amber-400" :
                                                "text-red-400"
                                    )}>
                                        {city.pulse}
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
            </CardContent>
        </Card>
    );
}
