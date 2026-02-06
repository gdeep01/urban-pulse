'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { TrafficIncident, TrafficLocation, RoadWork, GarbagePoint } from '@/lib/types';
import { getSeverityColor, getCongestionColor, escapeHtml, MAP_PALETTE as PALETTE } from '@/lib/map-utils';

interface CityMapProps {
    lat: number;
    lng: number;
    incidents?: TrafficIncident[];
    locations?: TrafficLocation[];
    roadWorks?: RoadWork[];
    garbagePoints?: GarbagePoint[];
    searchLocation?: { lat: number; lng: number; name: string } | null;
    onMapMove?: (lat: number, lng: number) => void;
    showHeatmap?: boolean;
    isSimulation?: boolean;
}


// Create custom icon for traffic circles - ENHANCED with ring animation
const createTrafficIcon = (level: number) => {
    const color = getCongestionColor(level);
    const size = Math.max(32, Math.min(48, level / 2 + 20));
    const ringSize = size + 8;
    const statusLabel = level >= 85 ? 'SEVERE' : level >= 60 ? 'HEAVY' : level >= 30 ? 'MODERATE' : 'LIGHT';

    return L.divIcon({
        className: 'custom-traffic-marker',
        html: `
            <div style="
                position: relative;
                width: ${ringSize}px;
                height: ${ringSize}px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <!-- Outer pulse ring -->
                <div style="
                    position: absolute;
                    width: ${ringSize}px;
                    height: ${ringSize}px;
                    border-radius: 50%;
                    border: 2px solid ${color}40;
                    animation: traffic-pulse 2s ease-in-out infinite;
                "></div>
                
                <!-- Main circle with gradient -->
                <div style="
                    width: ${size}px;
                    height: ${size}px;
                    background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 4px 20px ${color}60, inset 0 -2px 6px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    --glow-color: ${color};
                ">
                    <span style="
                        font-size: ${size > 40 ? '14px' : '12px'};
                        font-weight: 900;
                        color: white;
                        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
                        line-height: 1;
                    ">${level}%</span>
                </div>
            </div>
        `,
        iconSize: [ringSize, ringSize],
        iconAnchor: [ringSize / 2, ringSize / 2],
        popupAnchor: [0, -ringSize / 2],
    });
};

// Create custom icon for incidents - ENHANCED with type-specific icons
const createIncidentIcon = (severity: string, type: string) => {
    const color = getSeverityColor(severity);

    // Type-specific icons
    const icons: Record<string, string> = {
        accident: '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>',
        construction: '<path d="M22.73 22.27L20.46 20l-1.06 1.06 2.27 2.27 1.06-1.06zM15.17 7.53l5.66 5.66-1.41 1.41-5.66-5.66 1.41-1.41zM12 2l4 4-4 4-4-4 4-4zm0 4L9.41 3.41 6.83 6 12 11.17l5.17-5.17L12 1 6 7l2.83 2.83L12 6zM2.81 9.88l5.66 5.66-1.41 1.42-5.66-5.66 1.41-1.42zM1.27 22.27l1.06 1.06L4.6 21.06l-1.06-1.06-2.27 2.27zM10 19v4h4v-4h-4z"/>',
        closure: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>',
        congestion: '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
        default: '<path d="M12 2L1 21h22L12 2zm0 3.83L19.13 19H4.87L12 5.83zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>'
    };

    const iconPath = icons[type?.toLowerCase()] || icons.default;
    const isUrgent = severity?.toLowerCase() === 'severe' || severity?.toLowerCase() === 'major';

    return L.divIcon({
        className: 'custom-incident-marker',
        html: `
            <div style="
                position: relative;
                width: 52px;
                height: 60px;
            ">
                <!-- Animated pulse rings for urgent incidents -->
                ${isUrgent ? `
                    <div style="
                        position: absolute;
                        top: 4px;
                        left: 4px;
                        width: 44px;
                        height: 44px;
                        border-radius: 50%;
                        border: 2px solid ${color};
                        animation: incident-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                        opacity: 0.6;
                    "></div>
                ` : ''}
                
                <!-- Main marker body -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 6px;
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(145deg, ${color} 0%, ${color}cc 100%);
                    border: 3px solid white;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 16px ${color}80, 0 2px 8px rgba(0,0,0,0.3);
                    --glow-color: ${color};
                ">
                    <svg style="transform: rotate(45deg); width: 22px; height: 22px; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));" viewBox="0 0 24 24">
                        ${iconPath}
                    </svg>
                </div>
                
                <!-- Bottom pointer shadow -->
                <div style="
                    position: absolute;
                    bottom: 8px;
                    left: 18px;
                    width: 16px;
                    height: 6px;
                    background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%);
                    border-radius: 50%;
                "></div>
            </div>
        `,
        iconSize: [52, 60],
        iconAnchor: [26, 52],
        popupAnchor: [0, -48],
    });
};

// Create custom icon for road works
const createRoadWorkIcon = (severity: string) => {
    const color = severity === 'high' ? PALETTE.severe : severity === 'medium' ? PALETTE.heavy : PALETTE.moderate;
    return L.divIcon({
        className: 'custom-roadwork-marker',
        html: `
            <div style="
                width: 32px;
                height: 32px;
                background: ${color};
                border: 3px solid white;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 12px ${color}80;
            ">
                <svg style="width: 20px; height: 20px; fill: white;" viewBox="0 0 24 24">
                    <path d="M22.61 18.99l-9.08-9.09 1.77-1.77c.78-.78.78-2.05 0-2.83l-2.12-2.12c-.78-.78-2.05-.78-2.83 0L8.58 5.96l-.71-.71c-.78-.78-2.05-.78-2.83 0l-1.41 1.41c-.78.78-.78 2.05 0 2.83l.71.71-1.77 1.77c-.78.78-.78 2.05 0 2.83l2.12 2.12c.78.78 2.05.78 2.83 0l1.77-1.77 9.09 9.09c.78.78 2.05.78 2.83 0l1.41-1.41c.79-.79.79-2.06.01-2.84z"/>
                </svg>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

// Create custom icon for garbage points
const createGarbageIcon = (type: string, severity?: string) => {
    const color = type === 'dump_yard' ? '#a855f7' : type === 'collection_center' ? PALETTE.smooth : PALETTE.moderate;
    const emoji = type === 'user_report' ? '📢' : type === 'dump_yard' ? '🗑️' : type === 'collection_center' ? '♻️' : '⚠️';

    return L.divIcon({
        className: 'custom-garbage-marker',
        html: `
            <div style="
                width: 36px;
                height: 36px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 15px ${color}80;
                font-size: 18px;
            ">
                ${emoji}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
    });
};

// Create search marker icon
const createSearchMarkerIcon = () => {
    return L.divIcon({
        className: 'search-marker-bouncy',
        html: `
            <div style="
                width: 44px;
                height: 44px;
                background: #3b82f6;
                border: 4px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 25px rgba(59, 130, 246, 0.8);
            ">
                <svg style="transform: rotate(45deg); width: 24px; height: 24px; fill: white;" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        popupAnchor: [0, -44],
    });
};

const POPUP_STYLES = `
    .leaflet-container .leaflet-popup-content-wrapper {
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        border: none !important;
    }
    .leaflet-container .leaflet-popup-tip-container {
        display: none !important;
        opacity: 0 !important;
    }
    .leaflet-container .leaflet-popup-close-button {
        display: none !important;
        opacity: 0 !important;
    }
    .leaflet-container .leaflet-popup-content {
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
    }
    .leaflet-popup {
        margin-bottom: 25px !important;
        background: transparent !important;
        box-shadow: none !important;
        filter: none !important;
        animation: popup-enter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes popup-enter {
        from { opacity: 0; transform: scale(0.9) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .leaflet-tooltip {
        background: rgba(15, 23, 42, 0.95) !important;
        backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 10px !important;
        padding: 6px 12px !important;
        color: white !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        animation: tooltip-fade 0.2s ease-out !important;
    }
    @keyframes tooltip-fade {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .leaflet-tooltip-top:before {
        border-top-color: rgba(15, 23, 42, 0.95) !important;
    }
    @keyframes pulse-glow {
        0%, 100% { filter: drop-shadow(0 0 6px var(--glow-color)); }
        50% { filter: drop-shadow(0 0 16px var(--glow-color)); }
    }
    @keyframes traffic-pulse {
        0%, 100% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.15); opacity: 0.7; }
    }
    @keyframes incident-ping {
        0% { transform: scale(1); opacity: 0.6; }
        75%, 100% { transform: scale(1.8); opacity: 0; }
    }
    .custom-incident-marker {
        --glow-color: transparent;
        animation: pulse-glow 2.5s infinite ease-in-out;
    }
    .custom-traffic-marker {
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
    }
    .custom-traffic-marker:hover {
        transform: scale(1.15);
        z-index: 1001 !important;
        filter: brightness(1.1);
    }
`;

export function CityMap({
    lat,
    lng,
    incidents = [],
    locations = [],
    roadWorks = [],
    garbagePoints = [],
    searchLocation,
    onMapMove,
    showHeatmap,
    isSimulation = false
}: CityMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const heatLayerRef = useRef<any>(null);
    const hasInitializedBounds = useRef(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [resolvedLocations, setResolvedLocations] = useState<Record<string, string>>({});
    const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const isResolvingRef = useRef<Set<string>>(new Set());
    const searchMarkerRef = useRef<L.Marker | null>(null);

    // Helper: Resolve generic location strings with debouncing
    const resolveLocation = useCallback(async (id: string, lat: number, lng: number) => {
        if (resolvedLocations[id] || isResolvingRef.current.has(id)) return;

        isResolvingRef.current.add(id);
        try {
            const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
            if (!res.ok) {
                isResolvingRef.current.delete(id);
                return;
            }
            const data = await res.json();
            if (data.address && data.address !== 'Unknown location') {
                setResolvedLocations(prev => ({ ...prev, [id]: data.address }));
            }
        } catch (e) {
            console.error('Failed to resolve location:', e);
        } finally {
            isResolvingRef.current.delete(id);
        }
    }, [resolvedLocations]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: [lat, lng],
            zoom: 13,
            zoomControl: false,
            preferCanvas: true,
            layers: []
        });

        // Add premium dark base layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Traffic Flow Layer removed to keep roads clean per user request

        // Inject custom popup styles
        let style = document.getElementById('leaflet-custom-popups');
        if (!style) {
            style = document.createElement('style');
            style.id = 'leaflet-custom-popups';
            document.head.appendChild(style);
        }
        style.innerHTML = POPUP_STYLES;

        // Create marker cluster group
        const clusterGroup = (L as any).markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 40,
            disableClusteringAtZoom: 16,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                const size = 44;
                let color = PALETTE.smooth;

                if (count >= 15) color = PALETTE.severe;
                else if (count >= 8) color = PALETTE.heavy;
                else if (count >= 3) color = PALETTE.moderate;

                const radius = (size / 2) - 4;
                const circumference = 2 * Math.PI * radius;
                const percentage = Math.min(count / 20, 1.0);
                const offset = circumference - (percentage * circumference);

                return L.divIcon({
                    html: `
                        <div style="
                            position: relative;
                            width: ${size}px;
                            height: ${size}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
                                <circle 
                                    cx="${size / 2}" cy="${size / 2}" r="${radius}"
                                    fill="rgba(15, 23, 42, 0.8)" 
                                    stroke="rgba(71, 85, 105, 0.3)" 
                                    stroke-width="5"
                                />
                                <circle 
                                    cx="${size / 2}" cy="${size / 2}" r="${radius}"
                                    fill="none" 
                                    stroke="${color}" 
                                    stroke-width="5"
                                    stroke-linecap="round"
                                    stroke-dasharray="${circumference}"
                                    stroke-dashoffset="${offset}"
                                    style="filter: drop-shadow(0 0 5px ${color});"
                                />
                            </svg>
                            <span style="
                                position: absolute;
                                color: white;
                                font-size: 13px;
                                font-weight: 800;
                                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                                text-shadow: 0 0 10px rgba(0,0,0,0.5);
                            ">${count}</span>
                        </div>
                    `,
                    className: 'marker-cluster-gauge',
                    iconSize: L.point(size, size),
                });
            },
        });

        map.addLayer(clusterGroup);
        clusterGroupRef.current = clusterGroup;
        mapInstanceRef.current = map;

        // Lazy load heatmap library
        import('leaflet.heat').then(() => {
            setIsMapReady(true);
        }).catch(err => {
            console.error('Failed to load heatmap:', err);
            setIsMapReady(true);
        });

        // Debounced map move handler
        map.on('moveend', () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                const center = map.getCenter();
                onMapMove?.(center.lat, center.lng);
            }, 500);
        });

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update center when lat/lng changes
    useEffect(() => {
        if (mapInstanceRef.current && isMapReady) {
            mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom(), { animate: true });
        }
    }, [lat, lng, isMapReady]);

    // Update layers (Incidents, Traffic Circles, RoadWorks, Garbage & Search)
    useEffect(() => {
        if (!mapInstanceRef.current || !isMapReady || !clusterGroupRef.current) return;

        const map = mapInstanceRef.current;
        const clusterGroup = clusterGroupRef.current;
        const newMarkerIds = new Set<string>();

        // 1. Heatmap
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }
        if (showHeatmap && 'heatLayer' in L) {
            const points = incidents
                .filter(i => i && !isNaN(Number(i.lat)) && !isNaN(Number(i.lng)))
                .map(i => [
                    Number(i.lat),
                    Number(i.lng),
                    i.severity === 'severe' ? 1.0 :
                        i.severity === 'major' ? 0.8 : 0.5
                ]);

            if (points.length > 0) {
                heatLayerRef.current = (L as any).heatLayer(points, {
                    radius: 40,
                    blur: 25,
                    maxZoom: 16,
                    max: 0.8,
                    minOpacity: 0.3,
                    gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
                }).addTo(map);
            }
        }

        // 2. Search Location - BUG FIX: Proper management
        if (searchLocation) {
            const pos: [number, number] = [searchLocation.lat, searchLocation.lng];

            if (!searchMarkerRef.current) {
                // Create new search marker
                const marker = L.marker(pos, { icon: createSearchMarkerIcon(), zIndexOffset: 1000 });
                const popupContent = `
                    <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border-radius: 12px; padding: 15px; color: white; border: 1px solid rgba(59, 130, 246, 0.3);">
                        <h4 style="margin: 0 0 5px; font-weight: 800; color: #60a5fa;">📍 ${escapeHtml(searchLocation.name)}</h4>
                        <p style="margin: 0; font-size: 11px; opacity: 0.8; font-weight: 500;">Target Destination</p>
                    </div>
                `;
                marker.bindPopup(popupContent, { closeButton: false, offset: [0, -10] });
                marker.addTo(map);
                searchMarkerRef.current = marker;

                map.flyTo(pos, 15, { duration: 0.8 });
                setTimeout(() => searchMarkerRef.current?.openPopup(), 900);
            } else {
                // Update existing search marker
                searchMarkerRef.current.setLatLng(pos);
                const popupContent = `
                    <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border-radius: 12px; padding: 15px; color: white; border: 1px solid rgba(59, 130, 246, 0.3);">
                        <h4 style="margin: 0 0 5px; font-weight: 800; color: #60a5fa;">📍 ${escapeHtml(searchLocation.name)}</h4>
                        <p style="margin: 0; font-size: 11px; opacity: 0.8; font-weight: 500;">Target Destination</p>
                    </div>
                `;
                searchMarkerRef.current.getPopup()?.setContent(popupContent);
            }
        } else {
            // Remove search marker if searchLocation is null
            if (searchMarkerRef.current) {
                map.removeLayer(searchMarkerRef.current);
                searchMarkerRef.current = null;
            }
        }

        // 3. Helper for Unified Marker Creation/Update - BUG FIX: Proper popup updates
        const upsertPoint = (
            id: string,
            lat: number,
            lng: number,
            icon: L.DivIcon,
            content: string,
            tooltip: string,
            useCluster: boolean = true
        ) => {
            newMarkerIds.add(id);
            let marker = markersRef.current.get(id);
            const pos: [number, number] = [lat, lng];

            if (marker) {
                // BUG FIX: Update position first, then icon, then content
                marker.setLatLng(pos);
                marker.setIcon(icon);

                // BUG FIX: Properly update popup content
                const popup = marker.getPopup();
                if (popup) {
                    popup.setContent(content);
                } else {
                    marker.bindPopup(content, { autoPan: true, offset: [0, -5] });
                }

                // BUG FIX: Properly update tooltip content
                const tt = marker.getTooltip();
                if (tt) {
                    tt.setContent(tooltip);
                } else {
                    marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -10], opacity: 0.9 });
                }
            } else {
                // Create new marker
                marker = L.marker(pos, { icon });
                marker.bindPopup(content, { autoPan: true, offset: [0, -5] });
                marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -10], opacity: 0.9 });

                if (useCluster) {
                    clusterGroup.addLayer(marker);
                } else {
                    marker.addTo(map);
                }
                markersRef.current.set(id, marker);
            }
        };

        // 4. Traffic Locations (Circles)
        (locations || []).forEach((loc, idx) => {
            if (!loc || isNaN(loc.lat) || isNaN(loc.lng)) return;

            const id = `traffic-${idx}-${loc.name}`;
            const color = getCongestionColor(loc.congestionLevel);
            const statusLabel = loc.congestionLevel >= 80 ? 'Severe' : loc.congestionLevel >= 60 ? 'Heavy' : loc.congestionLevel >= 35 ? 'Moderate' : 'Light';
            const content = `
                <div style="min-width: 160px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; color: white; box-shadow: 0 8px 16px rgba(0,0,0,0.4);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #f8fafc; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(loc.name)}</h3>
                        <div style="width: 6px; height: 6px; background: ${color}; border-radius: 50%;"></div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="font-size: 20px; font-weight: 900; color: ${color}; line-height: 1;">${loc.congestionLevel}%</div>
                        <div style="flex: 1;">
                            <div style="height: 3px; background: rgba(255,255,255,0.1); border-radius: 1.5px; overflow: hidden; margin-bottom: 4px;">
                                <div style="height: 100%; width: ${loc.congestionLevel}%; background: ${color}; border-radius: 1.5px;"></div>
                            </div>
                            <div style="font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between;">
                                <span>${loc.trend === 'up' ? '↗' : '↘'} ${loc.eta || '15m'}</span>
                                <span style="font-weight: 600; color: ${color};">${statusLabel}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const tooltip = `<div style="display:flex;align-items:center;gap:6px;"><span style="color:${color};font-weight:700;">${loc.congestionLevel}%</span></div>`;
            upsertPoint(id, loc.lat, loc.lng, createTrafficIcon(loc.congestionLevel), content, tooltip);
        });

        // 5. Incidents - BUG FIX: Proper data handling and XSS prevention
        incidents.filter(i => i && !isNaN(Number(i.lat)) && !isNaN(Number(i.lng))).forEach((incident) => {
            const id = incident.id || `inc-${incident.lat}-${incident.lng}`;
            const color = getSeverityColor(incident.severity);
            const delayMin = Math.round((incident.delay || 0) / 60);
            const displayLocation = resolvedLocations[id] || incident.location || 'Main Street';

            const content = `
                <div style="min-width: 220px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 14px; color: white; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.5);">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="width: 32px; height: 32px; background: ${color}30; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid ${color}50;">
                            <svg style="width: 18px; height: 18px; fill: ${color};" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.83L19.13 19H4.87L12 5.83zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h4 style="font-weight: 800; font-size: 14px; margin: 0 0 4px; color: #f8fafc; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml((incident.type || 'incident').replace('_', ' '))}</h4>
                            <div style="font-size: 11px; color: #cbd5e1; line-height: 1.3; margin-bottom: 8px;">${escapeHtml(displayLocation)}</div>
                            
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 10px;">
                                <span style="background: ${color}20; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">${escapeHtml(incident.severity || 'Alert')}</span>
                                ${delayMin > 0 ? `<span style="color: #ef4444; font-weight: 600;">+${delayMin} min</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const tooltip = `<div style="display:flex;align-items:center;gap:6px;"><span style="color:${color}">⚠️ Incident</span></div>`;
            upsertPoint(id, incident.lat, incident.lng, createIncidentIcon(incident.severity, incident.type), content, tooltip);

            // Trigger resolution for generic locations
            if (incident.location?.startsWith('Street near') && !resolvedLocations[id]) {
                resolveLocation(id, incident.lat, incident.lng);
            }
        });

        // 6. RoadWorks
        (roadWorks || []).forEach((rw, idx) => {
            if (!rw || isNaN(rw.lat) || isNaN(rw.lng)) return;

            const id = `rw-${rw.id || idx}`;
            const color = rw.severity === 'high' ? PALETTE.severe : rw.severity === 'medium' ? PALETTE.heavy : PALETTE.moderate;
            const content = `
                <div style="min-width: 280px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; color: white;">
                    <div style="margin-bottom: 12px;">
                        <span style="padding: 3px 10px; border: 1px solid ${color}; border-radius: 4px; font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase;">Construction</span>
                    </div>
                    <h3 style="margin: 0 0 10px; font-size: 18px; font-weight: 900;">🚧 Road Maintenance</h3>
                    <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 12px;">${escapeHtml(rw.description || 'Maintenance in progress')}</p>
                    <div style="font-size: 12px; color: #94a3b8;">Location: <strong>${escapeHtml(rw.location || 'Not specified')}</strong></div>
                </div>
            `;
            const tooltip = `<div style="display:flex;align-items:center;gap:6px;"><span style="color:${color}">🚧 Maint.</span></div>`;
            upsertPoint(id, rw.lat, rw.lng, createRoadWorkIcon(rw.severity), content, tooltip);
        });

        // 7. Garbage Points
        (garbagePoints || []).forEach((g, idx) => {
            if (!g || isNaN(g.lat) || isNaN(g.lng)) return;

            const id = `garbage-${g.id || idx}`;
            const color = g.type === 'dump_yard' ? '#a855f7' : g.type === 'collection_center' ? PALETTE.smooth : PALETTE.moderate;
            const content = `
                <div style="min-width: 280px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; color: white;">
                    <div style="margin-bottom: 12px;">
                        <span style="padding: 3px 10px; border: 1px solid ${color}; border-radius: 4px; font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase;">Waste Intel</span>
                    </div>
                    <h3 style="margin: 0 0 10px; font-size: 18px; font-weight: 900;">${g.type === 'dump_yard' ? '🗑️ Dump Yard' : g.type === 'collection_center' ? '♻️ Collection Center' : '📢 User Report'}</h3>
                    <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 12px;">${escapeHtml(g.description || 'No description available')}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <span style="font-size: 12px; color: #94a3b8;">${escapeHtml(g.name || 'Unnamed location')}</span>
                        ${g.severity ? `<span style="font-size: 11px; font-weight: 700; color: ${color};">Impact: ${escapeHtml(g.severity)}</span>` : ''}
                    </div>
                </div>
            `;
            const tooltip = `<div style="display:flex;align-items:center;gap:6px;"><span style="color:${color}">${g.type === 'dump_yard' ? '🗑️ Yard' : g.type === 'collection_center' ? '♻️ Recyc' : '📢 Report'}</span></div>`;
            upsertPoint(id, g.lat, g.lng, createGarbageIcon(g.type, g.severity), content, tooltip);
        });

        // 8. Cleanup stale markers - BUG FIX: Proper cleanup
        markersRef.current.forEach((marker, id) => {
            if (!newMarkerIds.has(id)) {
                // Remove from both cluster and map
                clusterGroup.removeLayer(marker);
                map.removeLayer(marker);
                marker.remove(); // BUG FIX: Properly destroy marker
                markersRef.current.delete(id);
            }
        });

        // 9. Initial bounds fit (only once)
        if (!hasInitializedBounds.current) {
            const allPoints: [number, number][] = [
                ...incidents.filter(i => i && !isNaN(i.lat) && !isNaN(i.lng)).map(i => [Number(i.lat), Number(i.lng)] as [number, number]),
                ...(locations || []).filter(l => l && !isNaN(l.lat) && !isNaN(l.lng)).map(l => [l.lat, l.lng] as [number, number]),
                ...(roadWorks || []).filter(r => r && !isNaN(r.lat) && !isNaN(r.lng)).map(r => [r.lat, r.lng] as [number, number]),
                ...(garbagePoints || []).filter(g => g && !isNaN(g.lat) && !isNaN(g.lng)).map(g => [g.lat, g.lng] as [number, number])
            ];

            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                hasInitializedBounds.current = true;
            }
        }

    }, [incidents, locations, roadWorks, garbagePoints, searchLocation, showHeatmap, isMapReady, resolvedLocations, resolveLocation]);

    return (
        <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-slate-700/50">
            <div ref={mapRef} className="w-full h-full z-0" />

            {/* Demo Mode Indicator */}
            {isSimulation && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 rounded-full px-6 py-2.5 flex items-center gap-3 shadow-2xl shadow-amber-500/20">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                        <span className="text-[13px] font-bold text-amber-200 tracking-wide uppercase">
                            Demo Mode: <span className="text-amber-400/90 font-medium normal-case">High-Fidelity Simulation Active</span>
                        </span>
                        <div className="w-[1px] h-4 bg-amber-500/20" />
                        <span className="text-[11px] text-amber-500/70 font-medium">Auto-resets on API refresh</span>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-xl rounded-lg p-3 border border-slate-700/50 shadow-2xl min-w-[180px]">
                <div className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-tight pb-1 border-b border-white/5">Map Intelligence</div>

                <div className="space-y-2.5 text-[11px]">
                    {/* Traffic Section */}
                    <div className="space-y-1">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Flow & Safety</div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE.severe, filter: `drop-shadow(0 0 3px ${PALETTE.severe})` }} />
                            <span className="text-slate-300">Severe Congestion</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE.heavy, filter: `drop-shadow(0 0 3px ${PALETTE.heavy})` }} />
                            <span className="text-slate-300">Heavy Traffic</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE.moderate, filter: `drop-shadow(0 0 3px ${PALETTE.moderate})` }} />
                            <span className="text-slate-300">Moderate Alert</span>
                        </div>
                    </div>

                    {/* Infrastructure Section */}
                    <div className="space-y-1 pt-1 border-t border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Infrastructure</div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                            <span className="text-slate-300">Road Maintenance</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                            <span className="text-slate-300">Waste Intel Point</span>
                        </div>
                    </div>

                    {showHeatmap && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                            <span className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-red-500 rounded-sm" />
                            <span className="text-slate-400">Pulse Intensity</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}