import { NextRequest, NextResponse } from 'next/server';
import { GeocodingResult } from '@/lib/types';

// Rate limiting for Nominatim (1 request per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // ms

async function rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
}

// Predefined cities for quick lookup
const POPULAR_CITIES: Record<string, GeocodingResult> = {
    'bangalore': { lat: 12.9716, lng: 77.5946, displayName: 'Bangalore, Karnataka, India', city: 'Bangalore', country: 'India' },
    'bengaluru': { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka, India', city: 'Bengaluru', country: 'India' },
    'mumbai': { lat: 19.0760, lng: 72.8777, displayName: 'Mumbai, Maharashtra, India', city: 'Mumbai', country: 'India' },
    'delhi': { lat: 28.6139, lng: 77.2090, displayName: 'New Delhi, India', city: 'New Delhi', country: 'India' },
    'chennai': { lat: 13.0827, lng: 80.2707, displayName: 'Chennai, Tamil Nadu, India', city: 'Chennai', country: 'India' },
    'hyderabad': { lat: 17.3850, lng: 78.4867, displayName: 'Hyderabad, Telangana, India', city: 'Hyderabad', country: 'India' },
    'kolkata': { lat: 22.5726, lng: 88.3639, displayName: 'Kolkata, West Bengal, India', city: 'Kolkata', country: 'India' },
    'pune': { lat: 18.5204, lng: 73.8567, displayName: 'Pune, Maharashtra, India', city: 'Pune', country: 'India' },
    'london': { lat: 51.5074, lng: -0.1278, displayName: 'London, United Kingdom', city: 'London', country: 'United Kingdom' },
    'new york': { lat: 40.7128, lng: -74.0060, displayName: 'New York City, USA', city: 'New York', country: 'USA' },
    'tokyo': { lat: 35.6762, lng: 139.6503, displayName: 'Tokyo, Japan', city: 'Tokyo', country: 'Japan' },
    'singapore': { lat: 1.3521, lng: 103.8198, displayName: 'Singapore', city: 'Singapore', country: 'Singapore' },
};

async function fetchFromNominatim(query: string): Promise<GeocodingResult[]> {
    // Check popular cities first
    const normalizedQuery = query.toLowerCase().trim();
    if (POPULAR_CITIES[normalizedQuery]) {
        return [POPULAR_CITIES[normalizedQuery]];
    }

    await rateLimit();

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'UrbanPulse/1.0 (contact@example.com)',
            },
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        return data.map((item: { lat: string; lon: string; display_name: string; address?: { city?: string; town?: string; village?: string; country?: string }; boundingbox?: string[] }) => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            displayName: item.display_name,
            city: item.address?.city || item.address?.town || item.address?.village,
            country: item.address?.country,
            boundingBox: item.boundingbox?.map(Number) as [number, number, number, number],
        }));
    } catch (error) {
        console.error('Nominatim API Error:', error);
        return [];
    }
}

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

async function reverseGeocodeTomTom(lat: number, lng: number): Promise<string> {
    if (!TOMTOM_API_KEY) return 'Unknown location';
    try {
        const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}&radius=100`;
        const res = await fetch(url);
        if (!res.ok) return 'Unknown location';
        const data = await res.json();
        const address = data.addresses?.[0]?.address;
        if (!address) return 'Unknown location';
        return address.streetName || address.freeformAddress || address.municipalitySubdivision || 'Unknown location';
    } catch (e) {
        return 'Unknown location';
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Handle Reverse Geocoding
    if (lat && lng) {
        const address = await reverseGeocodeTomTom(parseFloat(lat), parseFloat(lng));
        return NextResponse.json({ address });
    }

    // Handle Forward Geocoding
    if (!query) {
        return NextResponse.json({ error: 'Query or lat/lng parameters are required' }, { status: 400 });
    }

    const results = await fetchFromNominatim(query);

    return NextResponse.json(results, {
        headers: {
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
    });
}
