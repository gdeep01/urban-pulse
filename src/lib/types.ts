// Database types for Urban Pulse
export interface City {
    id: string;
    name: string;
    lat: number;
    lng: number;
    country?: string;
    timezone?: string;
    created_at: string;
}

export interface LiveSnapshot {
    id: string;
    city_id: string;
    traffic_score: number;
    weather_score: number;
    raw_traffic_data?: TrafficData;
    raw_weather_data?: WeatherData;
    timestamp: string;
}

// API Response types
export interface TrafficData {
    currentSpeed: number;
    freeFlowSpeed: number;
    congestionLevel: number; // 0-100
    incidents: TrafficIncident[];
    roadSegments: RoadSegment[];
    isSimulation?: boolean;
}

// Enhanced Intelligence Layers
export interface TrafficLocation {
    name: string;
    lat: number;
    lng: number;
    congestionLevel: number; // 0-100
    trend?: 'up' | 'down' | 'stable';
    eta?: string;
}

export interface TrafficIncident {
    id: string;
    type: 'accident' | 'construction' | 'congestion' | 'road_closure' | 'other';
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    lat: number;
    lng: number;
    description: string;
    location?: string;
    delay?: number; // seconds
    jamType?: string;
    startTime?: string;
    endTime?: string;
}

export interface RoadWork {
    id: string;
    location: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    lat: number;
    lng: number;
    startTime?: string;
    endTime?: string;
}

export interface GarbagePoint {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: 'collection_center' | 'dump_yard' | 'hotspot' | 'user_report';
    description: string;
    severity?: 'low' | 'medium' | 'high';
    reportType?: string;
    reportedAt?: string;
}

export interface RoadSegment {
    id: string;
    name: string;
    currentSpeed: number;
    freeFlowSpeed: number;
    congestion: number;
    coordinates: [number, number][];
}

export interface WeatherData {
    temperature: number;
    feelsLike: number;
    humidity: number;
    visibility: number;
    windSpeed: number;
    windDirection: number;
    condition: WeatherCondition;
    precipitation: number;
    cloudCover: number;
    uvIndex: number;
    icon: string;
}

export type WeatherCondition =
    | 'clear'
    | 'partly_cloudy'
    | 'cloudy'
    | 'rain'
    | 'thunderstorm'
    | 'snow'
    | 'fog'
    | 'mist';

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
    city?: string;
    country?: string;
    boundingBox?: [number, number, number, number];
}

export interface CityLiveData {
    cityId: string;
    cityName: string;
    lat: number;
    lng: number;
    traffic: TrafficData;
    weather: WeatherData;
    trafficScore: number;
    weatherScore: number;
    lastUpdated: string;
}

// Map marker types
export interface MapMarker {
    id: string;
    lat: number;
    lng: number;
    type: 'traffic' | 'incident' | 'weather';
    data: TrafficIncident | WeatherData;
}

// Pulse Result types
export type PulseStatus = 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';

export interface PulseResult {
    pulse: number;
    trafficScore: number;
    weatherScore: number;
    sentimentScore: number;
    breakdown: {
        traffic: { raw: number; weighted: number };
        weather: { raw: number; weighted: number };
        sentiment: { raw: number; weighted: number };
    };
    status: PulseStatus;
    description: string;
}
