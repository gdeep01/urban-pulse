import { describe, it, expect } from 'vitest';
import { generateMockTrafficData, mapIncidentType, mapSeverity } from '../route';

describe('Traffic API Logic', () => {
    describe('generateMockTrafficData', () => {
        it('should generate a valid TrafficData object', () => {
            const data = generateMockTrafficData(12.9716, 77.5946, 'Bangalore');
            expect(data.isSimulation).toBe(true);
            expect(data.incidents.length).toBe(28);
            expect(data.congestionLevel).toBeGreaterThanOrEqual(30);
            expect(data.congestionLevel).toBeLessThanOrEqual(70);
        });

        it('should use city-specific roads if available', () => {
            const data = generateMockTrafficData(12.9716, 77.5946, 'Mumbai');
            const validRoads = ['Marine Drive', 'Linking Road', 'Worli Sea Face'];
            const roadNames = data.incidents.map(i => i.location);
            // Check if at least one road is from the Mumbai list
            const hasMumbaiRoad = roadNames.some(name => validRoads.includes(name!));
            expect(hasMumbaiRoad).toBe(true);
        });

        it('should calculate speed based on congestion level', () => {
            const data = generateMockTrafficData(0, 0);
            const expectedSpeed = data.freeFlowSpeed * (1 - data.congestionLevel / 100);
            expect(data.currentSpeed).toBeCloseTo(expectedSpeed, 1);
        });
    });

    describe('mapIncidentType', () => {
        it('should map TomTom icon categories correctly', () => {
            expect(mapIncidentType('1')).toBe('accident');
            expect(mapIncidentType('2')).toBe('congestion');
            expect(mapIncidentType('3')).toBe('road_closure');
            expect(mapIncidentType('4')).toBe('construction');
            expect(mapIncidentType('999')).toBe('other');
            expect(mapIncidentType(undefined)).toBe('other');
        });
    });

    describe('mapSeverity', () => {
        it('should map TomTom magnitudes correctly', () => {
            expect(mapSeverity(4)).toBe('severe');
            expect(mapSeverity(3)).toBe('major');
            expect(mapSeverity(2)).toBe('moderate');
            expect(mapSeverity(1)).toBe('minor');
            expect(mapSeverity(0)).toBe('minor');
            expect(mapSeverity(undefined)).toBe('minor');
        });
    });
});
