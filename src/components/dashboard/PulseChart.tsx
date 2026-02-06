'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PulseChartProps {
    data: Array<{
        time: string;
        pulse: number;
        traffic?: number;
        weather?: number;
        sentiment?: number;
        isForecast?: boolean;
        confidence?: number;
    }>;
}

// Generate mock historical data for demonstration
export function generateMockHistoricalData(currentPulse: number): PulseChartProps['data'] {
    const data: PulseChartProps['data'] = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const variation = Math.sin(i * 0.5) * 15 + (Math.random() - 0.5) * 10;
        const basePulse = i === 0 ? currentPulse : currentPulse + variation;

        data.push({
            time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            pulse: Math.max(0, Math.min(100, Math.round(basePulse))),
            traffic: Math.max(0, Math.min(100, Math.round(basePulse + (Math.random() - 0.5) * 20))),
            weather: Math.max(0, Math.min(100, Math.round(basePulse + (Math.random() - 0.5) * 15))),
            sentiment: Math.max(0, Math.min(100, Math.round(basePulse + (Math.random() - 0.5) * 25))),
            isForecast: false
        });
    }

    return data;
}

function getPulseColor(pulse: number): string {
    if (pulse >= 75) return '#10b981'; // emerald
    if (pulse >= 50) return '#f59e0b'; // amber
    if (pulse >= 25) return '#f97316'; // orange
    return '#ef4444'; // red
}

export function PulseChart({ data }: PulseChartProps) {
    // Memoize color based on latest pulse
    const pulseColor = useMemo(() => {
        const forecastStartIndex = data.findIndex(d => d.isForecast);
        const currentPulse = data[forecastStartIndex > 0 ? forecastStartIndex - 1 : data.length - 1]?.pulse || 0;
        return getPulseColor(currentPulse);
    }, [data]);

    const forecastStartIndex = data.findIndex(d => d.isForecast);

    return (
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    <span>24-Hour Pulse Trend & 2H Forecast</span>
                    <div className="flex items-center gap-3 text-xs font-normal">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500/50"></div> History</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-cyan-500 border-dashed border-t"></div> Forecast</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <defs>
                                <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={pulseColor} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={pulseColor} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.1} />
                                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                interval={Math.floor(data.length / 6)}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                tickCount={5}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(100, 116, 139, 0.3)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                                }}
                                labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                itemStyle={{ color: '#94a3b8' }}
                                formatter={(value, name, props) => {
                                    const isForecast = props.payload.isForecast;
                                    return [`${value}/100`, isForecast ? 'Start' : 'Pulse'];
                                }}
                            />

                            {/* Historical Area */}
                            <Area
                                type="monotone"
                                dataKey="pulse"
                                stroke={pulseColor}
                                strokeWidth={2}
                                fill="url(#pulseGradient)"
                            // Only render solid area for non-forecast points
                            // Recharts trick: split into two lines or use connectNulls?
                            // Easier: just render full history line
                            />

                            {/* Forecast Line (dashed) over the top if available */}
                            <Area
                                type="monotone"
                                dataKey={(d) => d.isForecast ? d.pulse : null}
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fill="url(#forecastGradient)"
                                connectNulls
                            />

                            {forecastStartIndex > 0 && (
                                <ReferenceLine x={data[forecastStartIndex].time} stroke="#475569" strokeDasharray="3 3" />
                            )}

                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Signal breakdown mini bars (only show for current/latest known point for now) */}
                {!data[data.length - 1]?.isForecast && (
                    <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                        {/* ... same bars as before ... */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-slate-400">
                                <span>Traffic</span>
                                <span>{data[data.length - 1]?.traffic || 0}</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${data[data.length - 1]?.traffic || 0}%` }} />
                            </div>
                        </div>
                        {/* ... weather ... */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-slate-400">
                                <span>Weather</span>
                                <span>{data[data.length - 1]?.weather || 0}</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${data[data.length - 1]?.weather || 0}%` }} />
                            </div>
                        </div>
                        {/* ... sentiment ... */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-slate-400">
                                <span>Sentiment</span>
                                <span>{data[data.length - 1]?.sentiment || 0}</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${data[data.length - 1]?.sentiment || 0}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
