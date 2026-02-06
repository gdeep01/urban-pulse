import { NextRequest, NextResponse } from 'next/server';
import { WeatherData, WeatherCondition } from '@/lib/types';

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const CACHE_DURATION = 300; // 5 minutes

// In-memory cache for multiple cities
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

function generateMockWeatherData(): WeatherData {
    const conditions: WeatherCondition[] = ['clear', 'partly_cloudy', 'cloudy', 'rain'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
        temperature: 25 + Math.floor(Math.random() * 10),
        feelsLike: 26 + Math.floor(Math.random() * 10),
        humidity: 50 + Math.floor(Math.random() * 30),
        visibility: 8000 + Math.floor(Math.random() * 2000),
        windSpeed: 5 + Math.floor(Math.random() * 15),
        windDirection: Math.floor(Math.random() * 360),
        condition,
        precipitation: condition === 'rain' ? Math.random() * 10 : 0,
        cloudCover: condition === 'clear' ? 10 : 40 + Math.floor(Math.random() * 50),
        uvIndex: 5 + Math.floor(Math.random() * 6),
        icon: mapConditionToIcon(condition),
    };
}

function mapConditionToIcon(condition: WeatherCondition): string {
    const icons: Record<WeatherCondition, string> = {
        clear: '01d',
        partly_cloudy: '02d',
        cloudy: '03d',
        rain: '10d',
        thunderstorm: '11d',
        snow: '13d',
        fog: '50d',
        mist: '50d',
    };
    return icons[condition];
}

function mapWeatherCode(code: number): WeatherCondition {
    if (code >= 200 && code < 300) return 'thunderstorm';
    if (code >= 300 && code < 400) return 'rain';
    if (code >= 500 && code < 600) return 'rain';
    if (code >= 600 && code < 700) return 'snow';
    if (code >= 700 && code < 800) return 'fog';
    if (code === 800) return 'clear';
    if (code === 801) return 'partly_cloudy';
    return 'cloudy';
}

async function fetchFromOpenWeatherMap(lat: number, lng: number): Promise<WeatherData> {
    if (!OPENWEATHERMAP_API_KEY) {
        console.log('OpenWeatherMap API key not configured, using mock data');
        return generateMockWeatherData();
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`OpenWeatherMap API error: ${response.status}`);
        }

        const data = await response.json();
        const condition = mapWeatherCode(data.weather[0].id);

        return {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            visibility: data.visibility || 10000,
            windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
            windDirection: data.wind.deg || 0,
            condition,
            precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
            cloudCover: data.clouds.all,
            uvIndex: 0, // Not available in basic API
            icon: data.weather[0].icon,
        };
    } catch (error) {
        console.error('OpenWeatherMap API Error:', error);
        return generateMockWeatherData();
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '12.9716');
    const lng = parseFloat(searchParams.get('lng') || '77.5946');
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    // Check cache
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
        return NextResponse.json(cached.data, {
            headers: {
                'Cache-Control': `public, max-age=${CACHE_DURATION}`,
                'X-Cache': 'HIT',
            },
        });
    }

    const weatherData = await fetchFromOpenWeatherMap(lat, lng);

    // Update cache
    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

    return NextResponse.json(weatherData, {
        headers: {
            'Cache-Control': `public, max-age=${CACHE_DURATION}`,
            'X-Cache': 'MISS',
        },
    });
}
