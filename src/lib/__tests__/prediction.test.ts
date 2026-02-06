import { describe, it, expect } from 'vitest';
import { predictPulse, DataPoint, PredictionPoint } from '../prediction';

describe('Prediction Engine', () => {
    describe('predictPulse', () => {
        it('should return flat prediction when history is empty', () => {
            const result = predictPulse([]);
            expect(result.length).toBeGreaterThan(0);
            // Default value should be 50
            expect(result[0].value).toBe(50);
            expect(result.every(p => p.value === 50)).toBe(true);
        });

        it('should return flat prediction when history has only one point', () => {
            const history: DataPoint[] = [
                { time: Date.now(), value: 75 }
            ];
            const result = predictPulse(history);
            expect(result.every(p => p.value === 75)).toBe(true);
        });

        it('should extrapolate upward trend correctly', () => {
            const now = Date.now();
            const history: DataPoint[] = [
                { time: now - 60000 * 10, value: 40 },  // 10 mins ago
                { time: now - 60000 * 5, value: 45 },   // 5 mins ago
                { time: now, value: 50 },               // now
            ];
            const result = predictPulse(history, 30, 15);

            // Should predict increasing values
            expect(result[0].value).toBeGreaterThanOrEqual(50);
        });

        it('should extrapolate downward trend correctly', () => {
            const now = Date.now();
            const history: DataPoint[] = [
                { time: now - 60000 * 10, value: 80 },
                { time: now - 60000 * 5, value: 70 },
                { time: now, value: 60 },
            ];
            const result = predictPulse(history, 30, 15);

            // Should predict decreasing values
            expect(result[0].value).toBeLessThanOrEqual(60);
        });

        it('should clamp predictions between 0 and 100', () => {
            const now = Date.now();
            // Extreme downward trend
            const history: DataPoint[] = [
                { time: now - 60000 * 2, value: 30 },
                { time: now - 60000 * 1, value: 15 },
                { time: now, value: 5 },
            ];
            const result = predictPulse(history, 120, 15);

            // All values should be clamped to at least 0
            expect(result.every(p => p.value >= 0 && p.value <= 100)).toBe(true);
        });

        it('should have decreasing confidence over time', () => {
            const now = Date.now();
            const history: DataPoint[] = [
                { time: now - 60000 * 5, value: 50 },
                { time: now, value: 55 },
            ];
            const result = predictPulse(history, 120, 15);

            // First prediction should have higher confidence than last
            expect(result[0].confidence).toBeGreaterThan(result[result.length - 1].confidence);
        });

        it('should generate correct number of prediction points', () => {
            const now = Date.now();
            const history: DataPoint[] = [
                { time: now - 60000, value: 50 },
                { time: now, value: 55 },
            ];

            // 120 minutes horizon with 15 minute intervals = 8 points
            const result = predictPulse(history, 120, 15);
            expect(result.length).toBe(8);

            // 60 minutes horizon with 10 minute intervals = 6 points
            const result2 = predictPulse(history, 60, 10);
            expect(result2.length).toBe(6);
        });

        it('should dampen steep slopes to prevent unrealistic predictions', () => {
            const now = Date.now();
            // Very steep upward trend
            const history: DataPoint[] = [
                { time: now - 60000 * 2, value: 20 },
                { time: now - 60000 * 1, value: 50 },
                { time: now, value: 80 },
            ];
            const result = predictPulse(history, 180, 30);

            // Last prediction should be pulled toward mean (50) due to damping
            // It shouldn't extrapolate linearly to infinity
            expect(result[result.length - 1].value).toBeLessThanOrEqual(100);
        });

        it('should produce valid ISO timestamps', () => {
            const now = Date.now();
            const history: DataPoint[] = [
                { time: now - 60000, value: 50 },
                { time: now, value: 55 },
            ];
            const result = predictPulse(history);

            result.forEach(point => {
                expect(() => new Date(point.time)).not.toThrow();
                expect(new Date(point.time).getTime()).toBeGreaterThan(now);
            });
        });
    });
});
