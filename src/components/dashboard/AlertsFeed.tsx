'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Info, Zap } from 'lucide-react';

interface UrbanEvent {
    id: string;
    event_type: 'traffic_spike' | 'pulse_drop' | 'severe_weather' | 'good_conditions';
    severity: 'info' | 'warning' | 'critical';
    description: string;
    timestamp: string;
}

export function AlertsFeed({ cityId }: { cityId: string }) {
    const [events, setEvents] = useState<UrbanEvent[]>([]);

    useEffect(() => {
        if (!cityId) return;

        // Initial fetch of recent events (last 6 hours)
        const fetchEvents = async () => {
            const past = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from('events')
                .select('*')
                .eq('city_id', cityId)
                .gt('timestamp', past)
                .order('timestamp', { ascending: false })
                .limit(10);

            if (data) setEvents(data as UrbanEvent[]);
        };

        fetchEvents();

        // Subscribe to new events
        const channel = supabase
            .channel('public:events')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'events',
                filter: `city_id=eq.${cityId}`
            }, (payload) => {
                const newEvent = payload.new as UrbanEvent;
                setEvents(prev => [newEvent, ...prev].slice(0, 10));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [cityId]);

    if (events.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[350px] space-y-2 pointer-events-none">
            {/* Only show latest 2 events as toasts, but this component could also be a sidebar list */}
            {events.slice(0, 3).map(event => (
                <Card key={event.id} className="bg-slate-900/90 border-slate-700 backdrop-blur-md shadow-xl animate-in slide-in-from-right-full pointer-events-auto">
                    <CardContent className="p-3 flex items-start gap-3">
                        <div className={`
               p-2 rounded-full shrink-0
               ${event.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                event.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-blue-500/20 text-blue-400'}
             `}>
                            {event.severity === 'critical' ? <AlertTriangle size={16} /> :
                                event.severity === 'warning' ? <Zap size={16} /> :
                                    <Info size={16} />}
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium text-slate-200 capitalize">
                                    {event.event_type.replace('_', ' ')}
                                </h4>
                                <span className="text-[10px] text-slate-500">
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-snug">
                                {event.description}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
