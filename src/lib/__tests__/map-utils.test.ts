import { describe, it, expect } from 'vitest';
import { getSeverityColor, getCongestionColor, escapeHtml, MAP_PALETTE } from '../map-utils';

describe('Map Utilities', () => {
    describe('getSeverityColor', () => {
        it('should return correct colors for all severity levels', () => {
            expect(getSeverityColor('severe')).toBe(MAP_PALETTE.severe);
            expect(getSeverityColor('major')).toBe(MAP_PALETTE.heavy);
            expect(getSeverityColor('heavy')).toBe(MAP_PALETTE.heavy);
            expect(getSeverityColor('moderate')).toBe(MAP_PALETTE.moderate);
            expect(getSeverityColor('minor')).toBe(MAP_PALETTE.smooth);
            expect(getSeverityColor('unknown')).toBe(MAP_PALETTE.smooth);
        });

        it('should be case-insensitive', () => {
            expect(getSeverityColor('SEVERE')).toBe(MAP_PALETTE.severe);
        });
    });

    describe('getCongestionColor', () => {
        it('should return correct colors based on percentage', () => {
            expect(getCongestionColor(10)).toBe(MAP_PALETTE.smooth);
            expect(getCongestionColor(45)).toBe(MAP_PALETTE.moderate);
            expect(getCongestionColor(75)).toBe(MAP_PALETTE.heavy);
            expect(getCongestionColor(90)).toBe(MAP_PALETTE.severe);
        });
    });

    describe('escapeHtml', () => {
        it('should escape dangerous characters', () => {
            const input = '<script>alert("xss")</script>';
            const escaped = escapeHtml(input);
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
            expect(escaped).toContain('&quot;xss&quot;');
        });

        it('should handle special characters correctly', () => {
            expect(escapeHtml('&')).toBe('&amp;');
            expect(escapeHtml("'")).toBe('&#039;');
        });
    });
});
