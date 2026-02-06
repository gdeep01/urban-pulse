import { describe, it, expect } from 'vitest';
import { normalizeTraffic, normalizeWeather, normalizeSentiment, aggregateSentiments } from '../normalizers';
import { TrafficData, WeatherData } from '../types';

describe('Normalizers', () => {
    describe('normalizeTraffic', () => {
        it('should return 100 for zero congestion and no incidents', () => {
            const traffic: TrafficData = {
                congestionLevel: 0,
                incidents: [],
                currentSpeed: 60,
                freeFlowSpeed: 60,
                roadSegments: []
            };
            expect(normalizeTraffic(traffic)).toBe(100);
        });

        it('should apply penalties for incidents', () => {
            const traffic: TrafficData = {
                congestionLevel: 10,
                incidents: [
                    { severity: 'minor', lat: 0, lng: 0, type: 'other', id: '1', description: '', location: '' },
                    { severity: 'severe', lat: 0, lng: 0, type: 'accident', id: '2', description: '', location: '' }
                ],
                currentSpeed: 50,
                freeFlowSpeed: 60,
                roadSegments: []
            };
            // 100 - 10 (congestion) - 2 (minor) - 15 (severe) = 73
            expect(normalizeTraffic(traffic)).toBe(73);
        });

        it('should clamp score between 0 and 100', () => {
            const traffic: TrafficData = {
                congestionLevel: 90,
                incidents: Array(10).fill({ severity: 'severe', lat: 0, lng: 0, type: 'accident' }),
                currentSpeed: 5,
                freeFlowSpeed: 60,
                roadSegments: []
            };
            expect(normalizeTraffic(traffic)).toBe(0);
        });
    });

    describe('normalizeWeather', () => {
        it('should return 100 for perfect weather', () => {
            const weather: WeatherData = {
                condition: 'clear',
                visibility: 10000,
                windSpeed: 5,
                precipitation: 0,
                temperature: 25,
                humidity: 50,
                feelsLike: 25,
                windDirection: 0,
                cloudCover: 0,
                uvIndex: 0,
                icon: ''
            };
            expect(normalizeWeather(weather)).toBe(100);
        });

        it('should apply penalties for bad conditions', () => {
            const weather: WeatherData = {
                condition: 'thunderstorm',
                visibility: 400, // -30
                windSpeed: 70,   // -25
                precipitation: 25, // -20
                temperature: 45, // -15
                humidity: 50,
                feelsLike: 45,
                windDirection: 0,
                cloudCover: 100,
                uvIndex: 0,
                icon: ''
            };
            // 100 - 50 (thunderstorm) - 30 (visibility) - 25 (wind) - 20 (precip) - 15 (temp) = -40 (clamped to 0)
            expect(normalizeWeather(weather)).toBe(0);
        });
    });

    describe('normalizeSentiment', () => {
        it('should return 50 for neutral', () => {
            expect(normalizeSentiment('neutral')).toBe(50);
        });

        it('should adjust based on confidence', () => {
            expect(normalizeSentiment('positive', 0.9)).toBeGreaterThan(80);
            expect(normalizeSentiment('negative', 0.9)).toBeLessThan(20);
        });
    });

    describe('aggregateSentiments', () => {
        it('should return 50 for empty list', () => {
            expect(aggregateSentiments([])).toBe(50);
        });

        it('should calculate weighted average', () => {
            const sentiments = [
                { score: 80, weight: 2 },
                { score: 20, weight: 1 }
            ];
            // (80*2 + 20*1) / 3 = 180 / 3 = 60
            expect(aggregateSentiments(sentiments)).toBe(60);
        });
    });
});
