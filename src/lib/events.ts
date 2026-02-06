
import { TrafficData, WeatherData } from './types';

export interface UrbanEvent {
    id?: string;
    city_id: string;
    event_type: 'traffic_spike' | 'pulse_drop' | 'severe_weather' | 'good_conditions';
    severity: 'info' | 'warning' | 'critical';
    description: string;
    timestamp: string;
}

interface PulseMetric {
    pulse: number;
    traffic: number; // 0-100 score
    weather: number; // 0-100 score
    sentiment: number; // 0-100 score
    timestamp: string;
}

/**
 * Detects anomalies by comparing current metrics to recent history
 */
export function detectAnomalies(
    current: PulseMetric,
    history: PulseMetric[], // Sorted ascending usually, but we need last 2-3 points
    cityId: string
): UrbanEvent[] {
    const events: UrbanEvent[] = [];

    if (!history || history.length === 0) return events;

    // Get previous point (assume history is sorted ascending, so last item is most recent previous)
    // Ensure we are comparing to something recent (e.g. 15-30 mins ago), not days ago.
    const previous = history[history.length - 1];

    // 1. Detect Pulse Drop
    // If pulse drops by > 10 points
    if (previous.pulse - current.pulse > 10) {
        events.push({
            city_id: cityId,
            event_type: 'pulse_drop',
            severity: 'warning',
            description: `Sudden drop in city pulse detected (-${previous.pulse - current.pulse} pts).`,
            timestamp: new Date().toISOString()
        });
    }

    // 2. Detect Traffic Spike (Score Drop)
    // Traffic score drop means worse traffic. Drop > 15 is significant.
    if (previous.traffic - current.traffic > 15) {
        events.push({
            city_id: cityId,
            event_type: 'traffic_spike',
            severity: 'critical',
            description: `Rapid congestion buildup detected. Traffic score fell by ${previous.traffic - current.traffic} points.`,
            timestamp: new Date().toISOString()
        });
    }

    // 3. Detect Severe Weather Onset
    // If weather score drops below 40 and was previously above 60
    if (current.weather < 40 && previous.weather >= 60) {
        events.push({
            city_id: cityId,
            event_type: 'severe_weather',
            severity: 'warning',
            description: `Adverse weather conditions detected.`,
            timestamp: new Date().toISOString()
        });
    }

    // 4. Positive Anomaly (Recovery)
    if (current.traffic - previous.traffic > 20) {
        events.push({
            city_id: cityId,
            event_type: 'good_conditions',
            severity: 'info',
            description: `Traffic flow is clearing up rapidly (+${current.traffic - previous.traffic} pts).`,
            timestamp: new Date().toISOString()
        });
    }

    return events;
}
