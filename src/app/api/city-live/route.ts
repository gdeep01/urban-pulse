import { NextRequest, NextResponse } from 'next/server';
import { TrafficData, WeatherData, PulseResult } from '@/lib/types';
import { PulseService } from '@/lib/services/pulse-service';
import { getCityInsight } from '@/lib/openrouter';

export interface CityLiveDataV2 {
    cityId: string;
    cityName: string;
    lat: number;
    lng: number;
    traffic: TrafficData;
    weather: WeatherData;
    trafficScore: number;
    weatherScore: number;
    sentimentScore: number;
    pulse: PulseResult;
    insight: string;
    lastUpdated: string;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat') || '12.9716';
    const lng = searchParams.get('lng') || '77.5946';
    const cityName = searchParams.get('cityName') || 'Bangalore';
    const cityId = searchParams.get('cityId') || 'default';

    const baseUrl = request.nextUrl.origin;

    try {
        // Fetch traffic, weather, and sentiment in parallel
        const [trafficRes, weatherRes, sentimentRes] = await Promise.all([
            fetch(`${baseUrl}/api/traffic?lat=${lat}&lng=${lng}&name=${encodeURIComponent(cityName)}`),
            fetch(`${baseUrl}/api/weather?lat=${lat}&lng=${lng}`),
            fetch(`${baseUrl}/api/sentiment?city=${encodeURIComponent(cityName)}`),
        ]);

        if (!trafficRes.ok || !weatherRes.ok) {
            throw new Error('Failed to fetch live data');
        }

        const traffic: TrafficData = await trafficRes.json();
        const weather: WeatherData = await weatherRes.json();
        const sentiment = sentimentRes.ok
            ? await sentimentRes.json()
            : { score: 50 }; // Neutral fallback

        // Calculate pulse using new engine
        const pulse = PulseService.calculatePulse({
            traffic,
            weather,
            sentimentScore: sentiment.score,
        });

        // Get AI insight (async, non-blocking)
        const insight = await getCityInsight(
            cityName,
            pulse.trafficScore,
            pulse.weatherScore,
            pulse.sentimentScore
        );

        const liveData: CityLiveDataV2 = {
            cityId,
            cityName,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            traffic,
            weather,
            trafficScore: pulse.trafficScore,
            weatherScore: pulse.weatherScore,
            sentimentScore: pulse.sentimentScore,
            pulse,
            insight,
            lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json(liveData, {
            headers: {
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('City Live API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch city data' },
            { status: 500 }
        );
    }
}
