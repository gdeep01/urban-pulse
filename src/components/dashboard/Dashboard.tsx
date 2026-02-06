'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CitySelector } from '@/components/dashboard/CitySelector';
import { LiveStatsCard } from '@/components/dashboard/LiveStatsCard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { ForecastCard } from '@/components/dashboard/ForecastCard';
import { AlertsFeed } from '@/components/dashboard/AlertsFeed';
import { CityRankingCard } from '@/components/dashboard/CityRankingCard';
import { PulseChart, generateMockHistoricalData } from '@/components/dashboard/PulseChart';
import { useCityLive } from '@/hooks/useApi';
import { GeocodingResult } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PulseService } from '@/lib/services/pulse-service';

// Dynamic import to avoid SSR issues with Leaflet
const CityMap = dynamic(
    () => import('@/components/map/CityMap').then((mod) => mod.CityMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[400px] bg-slate-900/50 rounded-xl flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-cyan-500 rounded-full" />
            </div>
        ),
    }
);

const DEFAULT_CITY = {
    lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_CITY_LAT || '12.9716'),
    lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_CITY_LNG || '77.5946'),
    name: process.env.NEXT_PUBLIC_DEFAULT_CITY_NAME || 'Bangalore',
};

// Icons as SVG components
const TrafficIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const WeatherIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
);

const SentimentIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PulseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

// Logic moved to PulseService

export default function Dashboard() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize state from URL or defaults
    const [city, setCity] = useState({
        lat: parseFloat(searchParams.get('lat') || DEFAULT_CITY.lat.toString()),
        lng: parseFloat(searchParams.get('lng') || DEFAULT_CITY.lng.toString()),
        name: searchParams.get('name') || DEFAULT_CITY.name,
    });
    const [mapMode, setMapMode] = useState<'markers' | 'hybrid'>('markers');

    const { data, isLoading, error } = useCityLive(city.lat, city.lng, city.name);

    const handleCitySelect = useCallback((result: GeocodingResult | { name: string; lat: number; lng: number }) => {
        const cityName = 'name' in result ? result.name : (result.city || '');
        const displayName = 'displayName' in result ? result.displayName.split(',')[0] : cityName;

        const newCity = {
            lat: result.lat,
            lng: result.lng,
            name: (displayName || cityName || 'Unknown').trim(),
        };

        setCity(newCity);

        // Sync to URL
        const params = new URLSearchParams();
        params.set('name', newCity.name);
        params.set('lat', newCity.lat.toString());
        params.set('lng', newCity.lng.toString());
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router]);

    // Generate mock historical data for chart
    const historicalData = data
        ? generateMockHistoricalData(data.pulse.pulse)
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                        Urban Pulse
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time city intelligence dashboard</p>
                </div>
                <CitySelector onCitySelect={handleCitySelect} currentCity={city.name} />
            </div>

            <Separator className="bg-slate-700/50" />

            {/* AI Insight & Forecast */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {/* Left col: Insight + Rankings */}
                <div className="space-y-4">
                    {data && (
                        <InsightCard
                            insight={data.insight}
                            pulseStatus={data.pulse.status}
                        />
                    )}
                    <CityRankingCard onCitySelect={handleCitySelect} />
                </div>

                {/* Right col: Forecast */}
                <div className="md:col-span-2 hidden md:block">
                    <ForecastCard cityName={city.name} />
                </div>
            </motion.div>

            {/* Mobile only Forecast (visible below insight on small screens) */}
            <div className="md:hidden">
                <ForecastCard cityName={city.name} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                    <LiveStatsCard
                        title="Traffic Flow"
                        value={data ? `${data.traffic.currentSpeed.toFixed(0)} km/h` : '—'}
                        score={data?.trafficScore ?? 0}
                        icon={<TrafficIcon />}
                        subtitle={data ? `Congestion: ${data.traffic.congestionLevel}%` : 'Loading...'}
                        isLoading={isLoading}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                    <LiveStatsCard
                        title="Weather"
                        value={data ? `${data.weather.temperature}°C` : '—'}
                        score={data?.weatherScore ?? 0}
                        icon={<WeatherIcon />}
                        subtitle={data ? PulseService.formatCondition(data.weather.condition) : 'Loading...'}
                        isLoading={isLoading}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                    <LiveStatsCard
                        title="Sentiment"
                        value={data ? PulseService.getSentimentLabel(data.sentimentScore) : '—'}
                        score={data?.sentimentScore ?? 0}
                        icon={<SentimentIcon />}
                        subtitle="Public mood index"
                        isLoading={isLoading}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                    <LiveStatsCard
                        title="City Pulse"
                        value={data?.pulse.pulse ?? '—'}
                        score={data?.pulse.pulse ?? 0}
                        icon={<PulseIcon />}
                        subtitle={data?.pulse.description.slice(0, 40) + '...' || 'Overall condition'}
                        isLoading={isLoading}
                    />
                </motion.div>
            </div>

            {/* Floating Alerts Feed */}
            {data?.cityId && <AlertsFeed cityId={data.cityId} />}

            {/* Chart and Map Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pulse Chart (Pass mock data for now, would ideally merge with forecast from API) */}
                {/* In a real scenario, we'd fetch forecast here and append to history */}
                <PulseChart data={historicalData} />

                {/* Map */}
                <div className="h-[300px] lg:h-auto min-h-[300px] relative group">
                    {/* Map Controls Overlay */}
                    <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur rounded-lg p-1 border border-slate-700 flex items-center gap-1 shadow-xl">
                        <button
                            onClick={() => setMapMode('markers')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded transition-all min-w-[70px] text-center",
                                mapMode === 'markers' || mapMode === 'hybrid'
                                    ? "bg-slate-700 text-slate-100 shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Markers
                        </button>
                        <button
                            onClick={() => setMapMode('hybrid')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded transition-all min-w-[70px] text-center",
                                mapMode === 'hybrid'
                                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                            )}
                        >
                            Heatmap
                        </button>
                    </div>

                    {error ? (
                        <div className="w-full h-full bg-slate-900/50 rounded-xl flex items-center justify-center text-red-400">
                            Failed to load city data. Please try again.
                        </div>
                    ) : (
                        <CityMap
                            lat={city.lat}
                            lng={city.lng}
                            incidents={data?.traffic.incidents}
                            showHeatmap={mapMode === 'hybrid'}
                            isSimulation={data?.traffic.isSimulation}
                        />
                    )}
                </div>
            </div>

            {/* Last Updated */}
            {data && (
                <div className="text-center text-xs text-slate-500">
                    Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                    {' • '}
                    Status: <span className="capitalize">{data.pulse.status}</span>
                    {' • '}
                    Auto-refreshes every minute
                </div>
            )}
        </div>
    );
}
