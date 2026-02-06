// Vibrant, Professional Palette
export const MAP_PALETTE = {
    smooth: '#10b981',   // Emerald 500
    moderate: '#f59e0b', // Amber 500
    heavy: '#f97316',    // Orange 500
    severe: '#ef4444',   // Red 500
};

export const getSeverityColor = (severity: string = ''): string => {
    const s = severity.toLowerCase();
    if (s === 'severe') return MAP_PALETTE.severe;
    if (s === 'major' || s === 'heavy') return MAP_PALETTE.heavy;
    if (s === 'moderate') return MAP_PALETTE.moderate;
    return MAP_PALETTE.smooth;
};

export const getCongestionColor = (level: number): string => {
    if (level < 30) return MAP_PALETTE.smooth;
    if (level < 60) return MAP_PALETTE.moderate;
    if (level < 85) return MAP_PALETTE.heavy;
    return MAP_PALETTE.severe;
};

// Escape HTML to prevent XSS
export const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};
