import { TrafficData, TrafficIncident, RoadSegment, WeatherData, WeatherCondition } from './types';

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

// --- Helper: Reverse Geocode ---
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!TOMTOM_API_KEY) return 'Unknown Road';
    try {
        const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const data = await res.json();
        const address = data.addresses?.[0]?.address;
        if (!address) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        return address.streetName || address.freeformAddress || address.municipalitySubdivision || 'Unknown Road';
    } catch (e) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

// --- Helper: Fetch Real Incidents ---
async function fetchRealIncidents(lat: number, lng: number): Promise<TrafficIncident[]> {
    if (!TOMTOM_API_KEY) return [];
    try {
        // Calculate a bounding box for ~10km radius
        const offset = 0.1;
        const minLat = lat - offset;
        const maxLat = lat + offset;
        const minLng = lng - offset;
        const maxLng = lng + offset;

        const url = `https://api.tomtom.com/traffic/services/4/incidentDetails/s3/${minLat},${minLng},${maxLat},${maxLng}/12/-1/json?key=${TOMTOM_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();

        const tm = data.tm;
        if (!tm || !tm.poi) return [];

        const incidents: TrafficIncident[] = await Promise.all(tm.poi.map(async (p: any, idx: number) => {
            const [pLng, pLat] = p.p;
            // TomTom sometimes gives incident start/end names in the description or 'from'/'to' fields
            // We'll reverse geocode to be sure of the road name
            const roadName = await reverseGeocode(pLat, pLng);

            return {
                id: p.id || `incident-${idx}`,
                type: mapIncidentType(p.ic),
                severity: mapIncidentSeverity(p.ty),
                lat: pLat,
                lng: pLng,
                description: p.d || 'Traffic incident',
                location: roadName,
                delay: p.dl || 0, // Delay in seconds
                jamType: p.f || 'Delay',
                startTime: p.sd,
                endTime: p.ed
            };
        }));

        return incidents;
    } catch (e) {
        console.error('Failed to fetch real incidents:', e);
        return [];
    }
}

function mapIncidentType(ic: number): TrafficIncident['type'] {
    // TomTom icon codes: 1=Accident, 6=Congestion, 7=Roadwork/Closure, etc.
    if (ic === 1) return 'accident';
    if (ic === 7 || ic === 9) return 'road_closure';
    if (ic === 11) return 'construction';
    if (ic === 6) return 'congestion';
    return 'other';
}

function mapIncidentSeverity(ty: number): TrafficIncident['severity'] {
    // TomTom severity: 1=minor, 2=moderate, 3=major, 4=severe
    if (ty === 4) return 'severe';
    if (ty === 3) return 'major';
    if (ty === 2) return 'moderate';
    return 'minor';
}

// --- Traffic Fetching Logic ---

function generateMockTrafficData(lat: number, lng: number, citySearchName: string = 'City'): TrafficData {
    const congestionLevel = Math.floor(Math.random() * 60) + 20; // 20-80
    const freeFlowSpeed = 60;
    const currentSpeed = freeFlowSpeed * (1 - congestionLevel / 100);

    const cityRoads: Record<string, string[]> = {
        'Bangalore': ['MG Road', 'Outer Ring Road', 'Bannerghatta Road', 'Old Madras Road', 'Indiranagar 100ft Road', 'Electronic City Flyover', 'Hebbal Flyover', 'Richmond Road', 'Hosur Road', 'Whitefield Main Road'],
        'Mumbai': ['Marine Drive', 'Linking Road', 'Worli Sea Face', 'Eastern Express Highway', 'Western Express Highway', 'Sion-Panvel Expressway', 'LBS Marg', 'SV Road', 'Colaba Causeway', 'JVLR'],
        'Delhi': ['Janpath', 'Rajpath', 'Ring Road', 'Outer Ring Road', 'NH-44', 'Connaught Place', 'Lodhi Road', 'Shanti Path', 'Nelson Mandela Marg', 'DND Flyway'],
        'Chennai': ['Anna Salai', 'OMR', 'ECR', 'GST Road', 'Mount Road', 'Poonamallee High Road', 'Arcot Road', '100 Feet Road', 'Cathedral Road', 'Velachery Main Road'],
        'Default': ['Main Street', 'Central Avenue', 'Park Road', 'Highway 1', 'Broadway', 'Bridge Road', 'Market Street', 'High Street', 'Station Road', 'Garden Lane']
    };

    const cityNameMatch = Object.keys(cityRoads).find(c => citySearchName.toLowerCase().includes(c.toLowerCase())) || 'Default';
    const roads = cityRoads[cityNameMatch];

    const incidents: TrafficIncident[] = [
        {
            id: '1',
            type: 'congestion',
            severity: 'moderate',
            lat: lat + (Math.random() - 0.5) * 0.05,
            lng: lng + (Math.random() - 0.5) * 0.05,
            description: 'Heavy traffic on main road',
            location: roads[Math.floor(Math.random() * roads.length)]
        },
        {
            id: '2',
            type: 'accident',
            severity: 'minor',
            lat: lat + (Math.random() - 0.5) * 0.05,
            lng: lng + (Math.random() - 0.5) * 0.05,
            description: 'Minor accident, lane blocked',
            location: roads[Math.floor(Math.random() * roads.length)]
        },
    ];

    return {
        currentSpeed,
        freeFlowSpeed,
        congestionLevel,
        incidents,
        roadSegments: [],
    };
}

export async function fetchTrafficData(lat: number, lng: number, cityName?: string): Promise<TrafficData> {
    if (!TOMTOM_API_KEY) {
        return generateMockTrafficData(lat, lng, cityName);
    }

    try {
        const flowUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_API_KEY}&point=${lat},${lng}`;
        const flowResponse = await fetch(flowUrl);

        if (!flowResponse.ok) throw new Error(`TomTom API error: ${flowResponse.status}`);
        const flowData = await flowResponse.json();

        // Fetch real incidents
        const incidents = await fetchRealIncidents(lat, lng);

        const segment = flowData.flowSegmentData;
        const freeFlowSpeed = segment.freeFlowSpeed || 60;
        const currentSpeed = segment.currentSpeed || 40;
        const congestionLevel = Math.round((1 - currentSpeed / freeFlowSpeed) * 100);

        return {
            currentSpeed,
            freeFlowSpeed,
            congestionLevel,
            incidents,
            roadSegments: [],
        };
    } catch (error) {
        console.error('TomTom API Error:', error);
        return generateMockTrafficData(lat, lng, cityName);
    }
}

// --- Weather Fetching Logic ---

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
        icon: '01d',
    };
}

export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData> {
    if (!OPENWEATHERMAP_API_KEY) {
        return generateMockWeatherData();
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`OpenWeatherMap API error: ${response.status}`);
        const data = await response.json();

        return {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            visibility: data.visibility || 10000,
            windSpeed: Math.round(data.wind.speed * 3.6),
            windDirection: data.wind.deg || 0,
            condition: 'clear', // Simplified mapping
            precipitation: 0,
            cloudCover: data.clouds.all,
            uvIndex: 0,
            icon: data.weather[0].icon,
        };
    } catch (error) {
        console.error('OpenWeatherMap API Error:', error);
        return generateMockWeatherData();
    }
}
