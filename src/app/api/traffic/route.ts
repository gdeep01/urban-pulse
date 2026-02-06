import { NextRequest, NextResponse } from 'next/server';
import { TrafficData, TrafficIncident, RoadSegment } from '@/lib/types';

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const CACHE_DURATION = 60; // seconds

// In-memory cache for reverse geocoding to avoid redundant hits
const geocodeCache = new Map<string, string>();

export function generateMockTrafficData(lat: number, lng: number, citySearchName: string = 'City'): TrafficData {
    const congestionLevel = Math.floor(Math.random() * 40) + 30; // 30-70%
    const freeFlowSpeed = 60;
    const currentSpeed = freeFlowSpeed * (1 - congestionLevel / 100);

    const cityRoads: Record<string, string[]> = {
        'Bangalore': ['MG Road', 'Outer Ring Road', 'Bannerghatta Road', 'Old Madras Road', '100ft Road Indiranagar', 'Electronic City Flyover', 'Hebbal Flyover', 'Richmond Road', 'Hosur Road', 'Whitefield Main Road', 'Sarjapur Road', 'Bellary Road', 'Mysore Road', 'Kanakapura Road'],
        'Mumbai': ['Marine Drive', 'Linking Road', 'Worli Sea Face', 'Eastern Express Highway', 'Western Express Highway', 'Sion-Panvel Expressway', 'LBS Marg', 'SV Road', 'Colaba Causeway', 'JVLR', 'Ghansoli Link Road', 'Palm Beach Road'],
        'Delhi': ['Janpath', 'Rajpath', 'Ring Road', 'Outer Ring Road', 'NH-44', 'Connaught Place', 'Lodhi Road', 'Shanti Path', 'Nelson Mandela Marg', 'DND Flyway', 'Mathura Road', 'Pusa Road'],
        'Chennai': ['Anna Salai', 'OMR', 'ECR', 'GST Road', 'Mount Road', 'Poonamallee High Road', 'Arcot Road', '100 Feet Road', 'Cathedral Road', 'Velachery Main Road', 'Inner Ring Road'],
        'Default': ['High Street', 'Main Road', 'Station Road', 'Park Lane', 'Broadway', 'King Avenue', 'Queen Street', 'Church Road', 'London Road', 'Victoria Street']
    };

    const cityName = Object.keys(cityRoads).find(c => citySearchName.toLowerCase().includes(c.toLowerCase())) || 'Default';
    const roads = cityRoads[cityName];

    const descriptions = [
        'Heavy congestion due to peak hour volume',
        'Vehicle breakdown blocking left lane',
        'Minor accident involving two-wheeler',
        'Road maintenance work in progress',
        'Water logging reported after recent rains',
        'Traffic signal malfunction causing delays',
        'Protest march moving slowly',
        'VIP movement causing temporary block',
        'Construction debris on the roadway',
        'Stalled bus near the intersection'
    ];

    const types: TrafficIncident['type'][] = ['congestion', 'accident', 'road_closure', 'construction', 'other'];
    const severities: TrafficIncident['severity'][] = ['minor', 'moderate', 'major', 'severe'];

    const incidents: TrafficIncident[] = Array.from({ length: 28 }).map((_, i) => {
        const iLat = lat + (Math.random() - 0.5) * 0.15; // Tighter spread (~15km)
        const iLng = lng + (Math.random() - 0.5) * 0.15;
        const road = roads[Math.floor(Math.random() * roads.length)];
        const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];

        return {
            id: `mock-${i}`,
            type: types[Math.floor(Math.random() * types.length)],
            severity,
            lat: iLat,
            lng: iLng,
            description: desc,
            location: road,
            delay: severity === 'severe' ? 1200 + Math.random() * 300 :
                severity === 'major' ? 600 + Math.random() * 200 :
                    severity === 'moderate' ? 300 + Math.random() * 100 : 120,
            jamType: severity === 'severe' ? 'Stationary traffic' : 'Slow traffic',
            isSimulation: true
        };
    });

    return {
        currentSpeed,
        freeFlowSpeed,
        congestionLevel,
        incidents,
        roadSegments: [],
        isSimulation: true,
    };
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(key)) return geocodeCache.get(key)!;

    if (!TOMTOM_API_KEY) return 'Unknown location';

    try {
        const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}&radius=50`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return 'Unknown location';
        const data = await res.json();
        const address = data.addresses?.[0]?.address?.streetName ||
            data.addresses?.[0]?.address?.freeformAddress ||
            'Unknown location';

        geocodeCache.set(key, address);
        return address;
    } catch (e) {
        return 'Unknown location';
    }
}

async function fetchFromTomTom(lat: number, lng: number, citySearchName: string): Promise<TrafficData> {
    if (!TOMTOM_API_KEY) {
        return generateMockTrafficData(lat, lng, citySearchName);
    }

    try {
        const flowUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_API_KEY}&point=${lat},${lng}`;
        const incidentsUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=${lng - 0.25},${lat - 0.25},${lng + 0.25},${lat + 0.25}`;

        const [flowRes, incRes] = await Promise.all([
            fetch(flowUrl),
            fetch(incidentsUrl)
        ]);

        if (!flowRes.ok) throw new Error('Flow API failed');
        const flowData = await flowRes.json();
        const incidentsData = incRes.ok ? await incRes.json() : { incidents: [] };

        const segment = flowData.flowSegmentData;
        const freeFlowSpeed = segment.freeFlowSpeed || 60;
        const currentSpeed = segment.currentSpeed || 40;
        const congestionLevel = Math.round((1 - currentSpeed / freeFlowSpeed) * 100);

        // Process all incidents returned by TomTom for full city-wide coverage
        const rawIncidents = incidentsData.incidents || [];

        const incidents: TrafficIncident[] = await Promise.all(rawIncidents.map(async (inc: any, index: number) => {
            const coords = inc.geometry?.coordinates;
            const props = inc.properties;

            let iLat = lat;
            let iLng = lng;

            if (Array.isArray(coords)) {
                if (typeof coords[0] === 'number') {
                    // Simple [lng, lat] point
                    iLng = coords[0];
                    iLat = coords[1] ?? lat;
                } else if (Array.isArray(coords[0]) && coords.length > 0) {
                    // LineString or MultiPoint [[lng, lat], ...]
                    // Use the midpoint of the coordinates for a better representative marker location
                    const midIndex = Math.floor(coords.length / 2);
                    if (coords[midIndex]) {
                        iLng = coords[midIndex][0] ?? lng;
                        iLat = coords[midIndex][1] ?? lat;
                    }
                }
            }

            // Prioritize road names provided by TomTom
            let location = props?.from || props?.to || props?.roadName;

            // Perform reverse geocoding for all incidents missing a location
            if (!location || location === 'Unknown') {
                location = await reverseGeocode(Number(iLat), Number(iLng));
            }

            const finalLocation = location && location !== 'Unknown location'
                ? location
                : `Street near ${citySearchName}`;

            const incidentDesc = props?.description || inc.description || 'Traffic incident';
            const eventDesc = props?.events?.[0]?.description || 'General delay';

            // Smart Delay Calculation: Use delay if present, otherwise estimate from magnitude
            // TomTom units are seconds
            let delay = props?.delay || 0;
            if (delay === 0) {
                const magnitude = props?.magnitudeOfDelay || 0;
                delay = magnitude === 4 ? 900 : magnitude === 3 ? 600 : magnitude === 2 ? 300 : 120;
            }

            // Extract more specific description if available
            const specificDesc = props?.events?.map((e: { description: string }) => e.description).join(', ') || incidentDesc;

            return {
                id: inc.id || String(Math.random()),
                type: mapIncidentType(props?.iconCategory),
                severity: mapSeverity(props?.magnitudeOfDelay),
                lat: Number(iLat),
                lng: Number(iLng),
                description: specificDesc,
                location: finalLocation,
                delay: delay,
                jamType: eventDesc,
                startTime: props?.startTime,
                endTime: props?.endTime
            };
        }));

        return { currentSpeed, freeFlowSpeed, congestionLevel, incidents, roadSegments: [], isSimulation: false };
    } catch (error) {
        console.error('TomTom API Error:', error);
        return generateMockTrafficData(lat, lng, citySearchName);
    }
}

export function mapIncidentType(category?: string): TrafficIncident['type'] {
    const mapping: Record<string, TrafficIncident['type']> = {
        '0': 'other', '1': 'accident', '2': 'congestion', '3': 'road_closure', '4': 'construction',
    };
    return mapping[category || '0'] || 'other';
}

export function mapSeverity(magnitude?: number): TrafficIncident['severity'] {
    // TomTom magnitudeOfDelay: 0=Unknown, 1=Minor, 2=Moderate, 3=Major, 4=Severe
    if (magnitude === 4) return 'severe';
    if (magnitude === 3) return 'major';
    if (magnitude === 2) return 'moderate';
    return 'minor';
}

const trafficCache = new Map<string, { data: TrafficData; timestamp: number }>();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '12.9716');
    const lng = parseFloat(searchParams.get('lng') || '77.5946');
    const name = searchParams.get('name') || 'Bangalore';
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${name}`;

    const cached = trafficCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
        return NextResponse.json(cached.data);
    }

    const trafficData = await fetchFromTomTom(lat, lng, name);
    trafficCache.set(cacheKey, { data: trafficData, timestamp: Date.now() });

    return NextResponse.json(trafficData);
}
