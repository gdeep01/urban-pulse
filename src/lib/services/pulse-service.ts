import { normalizeTraffic, normalizeWeather } from '../normalizers';
import { TrafficData, WeatherData, PulseResult } from '../types';

export interface PulseInput {
    traffic: TrafficData;
    weather: WeatherData;
    sentimentScore?: number; // 0-100, defaults to 50 (neutral)
}

/**
 * Weights for pulse calculation
 */
export const PULSE_WEIGHTS = {
    traffic: 0.4,
    weather: 0.3,
    sentiment: 0.3,
};

/**
 * Pulse Service: Centralized logic for city health monitoring
 */
export const PulseService = {
    /**
     * Calculate the City Pulse score from normalized signals
     */
    calculatePulse(input: PulseInput): PulseResult {
        const trafficScore = normalizeTraffic(input.traffic);
        const weatherScore = normalizeWeather(input.weather);
        const sentimentScore = input.sentimentScore ?? 50;

        const pulse = Math.round(
            trafficScore * PULSE_WEIGHTS.traffic +
            weatherScore * PULSE_WEIGHTS.weather +
            sentimentScore * PULSE_WEIGHTS.sentiment
        );

        const status = this.getPulseStatus(pulse);
        const description = this.getPulseDescription(status, trafficScore, weatherScore, sentimentScore);

        return {
            pulse,
            trafficScore,
            weatherScore,
            sentimentScore,
            breakdown: {
                traffic: { raw: trafficScore, weighted: Math.round(trafficScore * PULSE_WEIGHTS.traffic) },
                weather: { raw: weatherScore, weighted: Math.round(weatherScore * PULSE_WEIGHTS.weather) },
                sentiment: { raw: sentimentScore, weighted: Math.round(sentimentScore * PULSE_WEIGHTS.sentiment) },
            },
            status,
            description,
        };
    },

    /**
     * Map pulse score to a human-readable status
     */
    getPulseStatus(pulse: number): PulseResult['status'] {
        if (pulse >= 80) return 'excellent';
        if (pulse >= 65) return 'good';
        if (pulse >= 45) return 'moderate';
        if (pulse >= 25) return 'poor';
        return 'critical';
    },

    /**
     * Get pulse trend by comparing current to previous score
     */
    getPulseTrend(current: number, previous: number): 'improving' | 'stable' | 'declining' {
        const diff = current - previous;
        // Sensitivity threshold of 2 points to avoid "flickering" trends
        if (diff > 2) return 'improving';
        if (diff < -2) return 'declining';
        return 'stable';
    },

    /**
     * Generate a contextual description based on city metrics
     */
    getPulseDescription(
        status: PulseResult['status'],
        traffic: number,
        weather: number,
        sentiment: number
    ): string {
        const issues: string[] = [];

        if (traffic < 40) issues.push('heavy congestion');
        if (weather < 40) issues.push('adverse weather');
        if (sentiment < 40) issues.push('negative sentiment');

        switch (status) {
            case 'excellent':
                return 'City conditions are optimal. Clear roads, good weather, and positive vibes!';
            case 'good':
                return 'City is performing well with minor issues.';
            case 'moderate':
                return `Experiencing ${issues.join(' and ') || 'some stress'}. Plan accordingly.`;
            case 'poor':
                return `Significant urban stress from ${issues.join(', ') || 'multiple factors'}.`;
            case 'critical':
                return `Critical conditions: ${issues.join(', ') || 'widespread failure'}. Consider avoiding travel.`;
            default:
                return 'Monitoring city conditions...';
        }
    },

    /**
     * Transform numeric sentiment score to label
     */
    getSentimentLabel(score: number): 'Positive' | 'Neutral' | 'Negative' {
        if (score >= 65) return 'Positive';
        if (score >= 35) return 'Neutral';
        return 'Negative';
    },

    /**
     * Format weather condition strings for display
     */
    formatCondition(condition: string): string {
        return condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};
