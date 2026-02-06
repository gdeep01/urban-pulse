'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface Props {
    cityName: string;
}

interface PredictionResponse {
    forecast: Array<{ time: string; value: number; confidence: number }>;
    explanation: string;
    trend: 'improving' | 'declining' | 'stable';
}

export function ForecastCard({ cityName }: Props) {
    const { data, isLoading } = useQuery<PredictionResponse>({
        queryKey: ['prediction', cityName],
        queryFn: async () => {
            const res = await fetch(`/api/prediction?cityName=${encodeURIComponent(cityName)}`);
            if (!res.ok) throw new Error('Failed to fetch prediction');
            return res.json();
        }
    });

    if (isLoading || !data) return null;

    return (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm mt-4">
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    data.trend === 'improving' ? 'bg-emerald-500/20 text-emerald-400' :
                        data.trend === 'declining' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                )}>
                    {data.trend === 'improving' ? '↗' : data.trend === 'declining' ? '↘' : '→'}
                </div>

                <div>
                    <h3 className="text-sm font-medium text-slate-300">
                        2-Hour Outlook: <span className="text-slate-100 capitalize">{data.trend}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {data.explanation}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
