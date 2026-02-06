import { TrafficData, WeatherData, WeatherCondition } from './types';

/**
 * Normalize traffic congestion to a 0-100 score
 * Higher score = better traffic flow (inverted from congestion)
 */
export function normalizeTraffic(traffic: TrafficData): number {
    // Direct inversion: 100 - congestion level
    const baseScore = 100 - traffic.congestionLevel;

    // Apply incident penalty
    const incidentPenalty = traffic.incidents.reduce((penalty, incident) => {
        const severityPenalties = {
            minor: 2,
            moderate: 5,
            major: 10,
            severe: 15,
        };
        return penalty + (severityPenalties[incident.severity] || 0);
    }, 0);

    return Math.max(0, Math.min(100, baseScore - incidentPenalty));
}

/**
 * Normalize weather conditions to a 0-100 severity score
 * Higher score = better weather conditions
 */
export function normalizeWeather(weather: WeatherData): number {
    let score = 100;

    // Condition impact
    const conditionPenalties: Record<WeatherCondition, number> = {
        clear: 0,
        partly_cloudy: 5,
        cloudy: 10,
        mist: 15,
        fog: 25,
        rain: 30,
        snow: 40,
        thunderstorm: 50,
    };
    score -= conditionPenalties[weather.condition] || 0;

    // Visibility impact (meters)
    if (weather.visibility < 500) score -= 30;
    else if (weather.visibility < 1000) score -= 20;
    else if (weather.visibility < 5000) score -= 10;

    // Wind impact (km/h)
    if (weather.windSpeed > 60) score -= 25;
    else if (weather.windSpeed > 40) score -= 15;
    else if (weather.windSpeed > 25) score -= 5;

    // Precipitation impact (mm)
    if (weather.precipitation > 20) score -= 20;
    else if (weather.precipitation > 10) score -= 10;
    else if (weather.precipitation > 5) score -= 5;

    // Temperature extremes (Celsius)
    if (weather.temperature > 42 || weather.temperature < 0) score -= 15;
    else if (weather.temperature > 38 || weather.temperature < 5) score -= 5;

    return Math.max(0, Math.min(100, score));
}

/**
 * Normalize sentiment to a 0-100 score
 * 0 = very negative, 50 = neutral, 100 = very positive
 */
export function normalizeSentiment(
    label: 'positive' | 'neutral' | 'negative',
    confidence: number = 0.7
): number {
    const basescores = {
        positive: 80,
        neutral: 50,
        negative: 20,
    };

    const baseScore = basescores[label];
    // Adjust based on confidence: high confidence pushes score toward extremes
    const adjustment = (confidence - 0.5) * 20;

    if (label === 'positive') {
        return Math.min(100, baseScore + adjustment);
    } else if (label === 'negative') {
        return Math.max(0, baseScore - adjustment);
    }
    return baseScore;
}

/**
 * Aggregate multiple sentiment scores into a single score
 */
export function aggregateSentiments(
    sentiments: Array<{ score: number; weight?: number }>
): number {
    if (sentiments.length === 0) return 50; // neutral default

    const totalWeight = sentiments.reduce((sum, s) => sum + (s.weight || 1), 0);
    const weightedSum = sentiments.reduce(
        (sum, s) => sum + s.score * (s.weight || 1),
        0
    );

    return Math.round(weightedSum / totalWeight);
}
