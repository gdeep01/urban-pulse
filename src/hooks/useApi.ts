import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { GeocodingResult, TrafficData, WeatherData } from '@/lib/types';
import { CityLiveDataV2 } from '@/app/api/city-live/route';

export function useCityLive(lat: number, lng: number, cityName: string) {
    const queryClient = useQueryClient();
    const queryKey = useMemo(() => ['city-live', lat, lng], [lat, lng]);

    useEffect(() => {
        // Subscribe to real-time inserts on city_metrics
        const channel = supabase
            .channel('city-updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'city_metrics',
                },
                (payload) => {
                    // Check if update is for current city (would strictly require city_id check)
                    // For now, simpler invalidation triggers refetch
                    console.log('Realtime update received:', payload);
                    queryClient.invalidateQueries({ queryKey });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, queryKey]); // Re-subscribe if query changes

    return useQuery<CityLiveDataV2>({
        queryKey,
        queryFn: async () => {
            const res = await fetch(
                `/api/city-live?lat=${lat}&lng=${lng}&cityName=${encodeURIComponent(cityName)}`
            );
            if (!res.ok) throw new Error('Failed to fetch city data');
            return res.json();
        },
        // Keep internal polling as backup, but slower
        refetchInterval: 5 * 60 * 1000,
    });
}

export function useTraffic(lat: number, lng: number) {
    return useQuery<TrafficData>({
        queryKey: ['traffic', lat, lng],
        queryFn: async () => {
            const res = await fetch(`/api/traffic?lat=${lat}&lng=${lng}`);
            if (!res.ok) throw new Error('Failed to fetch traffic data');
            return res.json();
        },
        staleTime: 60000,
    });
}

export function useWeather(lat: number, lng: number) {
    return useQuery<WeatherData>({
        queryKey: ['weather', lat, lng],
        queryFn: async () => {
            const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
            if (!res.ok) throw new Error('Failed to fetch weather data');
            return res.json();
        },
        staleTime: 300000, // 5 minutes
    });
}

export function useGeocode(query: string) {
    return useQuery<GeocodingResult[]>({
        queryKey: ['geocode', query],
        queryFn: async () => {
            if (!query.trim()) return [];
            const res = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Failed to geocode');
            return res.json();
        },
        enabled: query.length >= 2,
        staleTime: 3600000, // 1 hour
    });
}

export function useReverseGeocode(lat: number, lng: number, enabled: boolean = true) {
    return useQuery<{ address: string }>({
        queryKey: ['reverse-geocode', lat, lng],
        queryFn: async () => {
            const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
            if (!res.ok) throw new Error('Failed to reverse geocode');
            return res.json();
        },
        enabled: enabled && !!lat && !!lng,
        staleTime: 86400000, // 24 hours
    });
}

interface SentimentData {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    sources: Array<{
        source: string;
        text: string;
        label: string;
        confidence: number;
    }>;
    lastUpdated: string;
}

export function useSentiment(cityName: string) {
    return useQuery<SentimentData>({
        queryKey: ['sentiment', cityName],
        queryFn: async () => {
            const res = await fetch(`/api/sentiment?city=${encodeURIComponent(cityName)}`);
            if (!res.ok) throw new Error('Failed to fetch sentiment');
            return res.json();
        },
        staleTime: 600000, // 10 minutes
    });
}
