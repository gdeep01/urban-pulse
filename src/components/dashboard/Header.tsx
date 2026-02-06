'use client';

import { Activity, Settings } from 'lucide-react';
import { NotificationsPanel } from './NotificationsPanel';
import { useEffect, useState } from 'react';

export const Header = () => {
    const [time, setTime] = useState<string>('');
    const [date, setDate] = useState<string>('');

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }));

            setDate(now.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }));
        };

        updateDateTime();
        const interval = setInterval(updateDateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute -inset-1 bg-cyan-500/20 rounded-xl blur-lg -z-10" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">DXP</span>
                                <span className="text-slate-100 italic ml-1">Traffic</span>
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mt-1">Intelligence Layer</p>
                        </div>
                    </div>

                    {/* Time & Date */}
                    <div className="hidden md:flex flex-col items-center">
                        <span className="text-2xl font-mono font-black text-white tracking-tighter">{time}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{date}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <NotificationsPanel />
                        <button className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-300 group">
                            <Settings className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
