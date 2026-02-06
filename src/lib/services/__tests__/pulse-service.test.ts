import { describe, it, expect } from 'vitest';
import { PulseService } from '../pulse-service';
import { TrafficData, WeatherData } from '../../types';

const mockTraffic: TrafficData = {
    currentSpeed: 30,
    freeFlowSpeed: 60,
    congestionLevel: 50,
    incidents: [],
    roadSegments: [],
};

const mockWeather: WeatherData = {
    temperature: 25,
    feelsLike: 27,
    humidity: 60,
    visibility: 10000,
    windSpeed: 10,
    windDirection: 180,
    condition: 'clear',
    precipitation: 0,
    cloudCover: 10,
    uvIndex: 5,
    icon: '01d',
};

describe('PulseService', () => {
    describe('calculatePulse', () => {
        it('should calculate a reasonable pulse score', () => {
            const result = PulseService.calculatePulse({
                traffic: mockTraffic,
                weather: mockWeather,
                sentimentScore: 70,
            });

            expect(result.pulse).toBeGreaterThan(0);
            expect(result.pulse).toBeLessThanOrEqual(100);
            expect(result.status).toBeDefined();
        });

        it('should handle missing sentiment score with a default', () => {
            const result = PulseService.calculatePulse({
                traffic: mockTraffic,
                weather: mockWeather,
            });
            expect(result.sentimentScore).toBe(50);
        });
    });

    describe('getPulseStatus', () => {
        it('should return excellent for scores >= 80', () => {
            expect(PulseService.getPulseStatus(85)).toBe('excellent');
        });

        it('should return critical for scores < 25', () => {
            expect(PulseService.getPulseStatus(15)).toBe('critical');
        });
    });

    describe('getPulseTrend', () => {
        it('should return improving when score increases significantly', () => {
            expect(PulseService.getPulseTrend(75, 70)).toBe('improving');
        });

        it('should return declining when score decreases significantly', () => {
            expect(PulseService.getPulseTrend(60, 65)).toBe('declining');
        });

        it('should return stable for minor changes', () => {
            expect(PulseService.getPulseTrend(70, 71)).toBe('stable');
        });
    });

    describe('getSentimentLabel', () => {
        it('should return Positive for high scores', () => {
            expect(PulseService.getSentimentLabel(80)).toBe('Positive');
        });

        it('should return Negative for low scores', () => {
            expect(PulseService.getSentimentLabel(20)).toBe('Negative');
        });
    });

    describe('formatCondition', () => {
        it('should format snake_case conditions to Title Case', () => {
            expect(PulseService.formatCondition('partly_cloudy')).toBe('Partly Cloudy');
        });
    });
});
