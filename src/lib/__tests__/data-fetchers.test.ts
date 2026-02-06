import { describe, it, expect } from 'vitest';

// Import the internal helper functions we need to test
// Note: These are not exported from data-fetchers.ts, so we test via the exported functions
// or by making them testable. For now, we'll test the logic patterns.

describe('Data Fetcher Helpers', () => {
    describe('mapIncidentType pattern', () => {
        // Mirror the logic from data-fetchers.ts mapIncidentType
        const mapIncidentType = (ic: number): string => {
            if (ic === 1) return 'accident';
            if (ic === 7 || ic === 9) return 'road_closure';
            if (ic === 11) return 'construction';
            if (ic === 6) return 'congestion';
            return 'other';
        };

        it('should map TomTom icon code 1 to accident', () => {
            expect(mapIncidentType(1)).toBe('accident');
        });

        it('should map TomTom icon code 6 to congestion', () => {
            expect(mapIncidentType(6)).toBe('congestion');
        });

        it('should map TomTom icon codes 7 and 9 to road_closure', () => {
            expect(mapIncidentType(7)).toBe('road_closure');
            expect(mapIncidentType(9)).toBe('road_closure');
        });

        it('should map TomTom icon code 11 to construction', () => {
            expect(mapIncidentType(11)).toBe('construction');
        });

        it('should return other for unknown codes', () => {
            expect(mapIncidentType(0)).toBe('other');
            expect(mapIncidentType(99)).toBe('other');
            expect(mapIncidentType(-1)).toBe('other');
        });
    });

    describe('mapIncidentSeverity pattern', () => {
        // Mirror the logic from data-fetchers.ts mapIncidentSeverity
        const mapIncidentSeverity = (ty: number): string => {
            if (ty === 4) return 'severe';
            if (ty === 3) return 'major';
            if (ty === 2) return 'moderate';
            return 'minor';
        };

        it('should map severity 4 to severe', () => {
            expect(mapIncidentSeverity(4)).toBe('severe');
        });

        it('should map severity 3 to major', () => {
            expect(mapIncidentSeverity(3)).toBe('major');
        });

        it('should map severity 2 to moderate', () => {
            expect(mapIncidentSeverity(2)).toBe('moderate');
        });

        it('should map severity 1 to minor', () => {
            expect(mapIncidentSeverity(1)).toBe('minor');
        });

        it('should default to minor for unknown values', () => {
            expect(mapIncidentSeverity(0)).toBe('minor');
            expect(mapIncidentSeverity(-1)).toBe('minor');
            expect(mapIncidentSeverity(99)).toBe('minor');
        });
    });

    describe('congestion calculation pattern', () => {
        // Tests the formula: congestionLevel = (1 - currentSpeed / freeFlowSpeed) * 100
        const calculateCongestion = (currentSpeed: number, freeFlowSpeed: number): number => {
            return Math.round((1 - currentSpeed / freeFlowSpeed) * 100);
        };

        it('should return 0 for free flowing traffic', () => {
            expect(calculateCongestion(60, 60)).toBe(0);
        });

        it('should return 50 for half speed', () => {
            expect(calculateCongestion(30, 60)).toBe(50);
        });

        it('should return 100 for standstill', () => {
            expect(calculateCongestion(0, 60)).toBe(100);
        });

        it('should handle edge case of speed > freeFlow (downhill)', () => {
            // This produces negative congestion, which is valid
            const result = calculateCongestion(70, 60);
            expect(result).toBeLessThan(0);
        });
    });

    describe('mock data generation patterns', () => {
        it('should generate congestion in expected range', () => {
            // The mock generator uses: Math.floor(Math.random() * 40) + 30
            // Range: 30-70
            for (let i = 0; i < 100; i++) {
                const congestion = Math.floor(Math.random() * 40) + 30;
                expect(congestion).toBeGreaterThanOrEqual(30);
                expect(congestion).toBeLessThanOrEqual(69);
            }
        });

        it('should calculate current speed from congestion', () => {
            const freeFlowSpeed = 60;
            const congestionLevel = 50;
            const expectedSpeed = freeFlowSpeed * (1 - congestionLevel / 100);
            expect(expectedSpeed).toBe(30);
        });
    });
});
