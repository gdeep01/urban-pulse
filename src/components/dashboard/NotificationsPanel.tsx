'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export const NotificationsPanel = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-300 relative group"
            >
                <Bell className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900 group-hover:scale-110 transition-transform" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                        <h3 className="font-bold text-slate-200 text-sm">Urban Intelligence</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-0.5 rounded">3 New</span>
                    </div>

                    <div className="space-y-3">
                        <NotificationItem
                            type="severe"
                            title="Severe Congestion"
                            desc="Indiranagar 100ft Rd: 45 min delay detected."
                            time="2m ago"
                        />
                        <NotificationItem
                            type="moderate"
                            title="Slow Moving Traffic"
                            desc="Silk Board Junction: Normalizing flow."
                            time="15m ago"
                        />
                        <NotificationItem
                            type="info"
                            title="System Update"
                            desc="Traffic prediction models recalibrated."
                            time="1h ago"
                        />
                    </div>

                    <button className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest border-t border-white/5 pt-3">
                        View All Reports
                    </button>
                </div>
            )}
        </div>
    );
};

const NotificationItem = ({ type, title, desc, time }: { type: 'severe' | 'moderate' | 'info', title: string, desc: string, time: string }) => {
    const color = type === 'severe' ? 'text-rose-400' : type === 'moderate' ? 'text-amber-400' : 'text-cyan-400';

    return (
        <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
            <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full", type === 'severe' ? 'bg-rose-500' : type === 'moderate' ? 'bg-amber-500' : 'bg-cyan-500')} />
            <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                    <h4 className={cn("text-xs font-bold", color)}>{title}</h4>
                    <span className="text-[10px] text-slate-600 font-medium">{time}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{desc}</p>
            </div>
        </div>
    );
};
