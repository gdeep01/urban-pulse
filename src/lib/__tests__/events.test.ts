import { describe, it, expect } from 'vitest';
import { detectAnomalies, UrbanEvent } from '../events';

interface PulseMetric {
    pulse: number;
    traffic: number;
    weather: number;
    sentiment: number;
    timestamp: string;
}

const createMetric = (overrides: Partial<PulseMetric> = {}): PulseMetric => ({
    pulse: 70,
    traffic: 70,
    weather: 70,
    sentiment: 70,
    timestamp: new Date().toISOString(),
    ...overrides,
});

describe('Event Detection', () => {
    describe('detectAnomalies', () => {
        const cityId = 'test-city';

        it('should return empty array for empty history', () => {
            const current = createMetric();
            const result = detectAnomalies(current, [], cityId);
            expect(result).toEqual([]);
        });

        it('should detect pulse drop > 10 points', () => {
            const current = createMetric({ pulse: 60 });
            const history = [createMetric({ pulse: 75 })];

            const result = detectAnomalies(current, history, cityId);

            const pulseDrop = result.find(e => e.event_type === 'pulse_drop');
            expect(pulseDrop).toBeDefined();
            expect(pulseDrop?.severity).toBe('warning');
        });

        it('should NOT detect pulse drop <= 10 points', () => {
            const current = createMetric({ pulse: 65 });
            const history = [createMetric({ pulse: 75 })];

            const result = detectAnomalies(current, history, cityId);

            const pulseDrop = result.find(e => e.event_type === 'pulse_drop');
            expect(pulseDrop).toBeUndefined();
        });

        it('should detect traffic spike (score drop > 15)', () => {
            const current = createMetric({ traffic: 50 });
            const history = [createMetric({ traffic: 70 })];

            const result = detectAnomalies(current, history, cityId);

            const trafficSpike = result.find(e => e.event_type === 'traffic_spike');
            expect(trafficSpike).toBeDefined();
            expect(trafficSpike?.severity).toBe('critical');
        });

        it('should detect severe weather onset', () => {
            const current = createMetric({ weather: 35 });
            const history = [createMetric({ weather: 65 })];

            const result = detectAnomalies(current, history, cityId);

            const severeWeather = result.find(e => e.event_type === 'severe_weather');
            expect(severeWeather).toBeDefined();
            expect(severeWeather?.severity).toBe('warning');
        });

        it('should NOT detect severe weather if previous was already bad', () => {
            const current = createMetric({ weather: 35 });
            const history = [createMetric({ weather: 40 })]; // Was already below 60

            const result = detectAnomalies(current, history, cityId);

            const severeWeather = result.find(e => e.event_type === 'severe_weather');
            expect(severeWeather).toBeUndefined();
        });

        it('should detect recovery (traffic improvement > 20)', () => {
            const current = createMetric({ traffic: 80 });
            const history = [createMetric({ traffic: 55 })];

            const result = detectAnomalies(current, history, cityId);

            const recovery = result.find(e => e.event_type === 'good_conditions');
            expect(recovery).toBeDefined();
            expect(recovery?.severity).toBe('info');
        });

        it('should detect multiple events simultaneously', () => {
            const current = createMetric({ pulse: 40, traffic: 30, weather: 35 });
            const history = [createMetric({ pulse: 80, traffic: 80, weather: 80 })];

            const result = detectAnomalies(current, history, cityId);

            // Should detect: pulse_drop, traffic_spike, severe_weather
            expect(result.length).toBeGreaterThanOrEqual(3);
            expect(result.some(e => e.event_type === 'pulse_drop')).toBe(true);
            expect(result.some(e => e.event_type === 'traffic_spike')).toBe(true);
            expect(result.some(e => e.event_type === 'severe_weather')).toBe(true);
        });

        it('should use the last item in history as previous metric', () => {
            const current = createMetric({ pulse: 60 });
            // History has multiple entries, last one is what matters
            const history = [
                createMetric({ pulse: 90 }), // Old
                createMetric({ pulse: 75 })  // Most recent previous
            ];

            const result = detectAnomalies(current, history, cityId);

            const pulseDrop = result.find(e => e.event_type === 'pulse_drop');
            expect(pulseDrop).toBeDefined();
            // Drop is 75 - 60 = 15 (> 10)
            expect(pulseDrop?.description).toContain('-15');
        });

        it('should include correct city_id in events', () => {
            const current = createMetric({ pulse: 50 });
            const history = [createMetric({ pulse: 70 })];

            const result = detectAnomalies(current, history, 'mumbai-city');

            expect(result.every(e => e.city_id === 'mumbai-city')).toBe(true);
        });
    });
});
