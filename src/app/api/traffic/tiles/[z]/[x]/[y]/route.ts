import { NextRequest, NextResponse } from 'next/server';

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
    if (!TOMTOM_API_KEY) {
        return new NextResponse('API Key missing', { status: 500 });
    }

    const { z, x, y } = await params;

    // TomTom Raster Flow Tiles URL
    // Style: 'absolute' (standard speed-based colors), 
    // MapType: 'flow'
    // Version: 4
    const url = `https://api.tomtom.com/traffic/map/4/tile/flow/absolute/${z}/${x}/${y}.png?key=${TOMTOM_API_KEY}`;

    try {
        const res = await fetch(url, {
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!res.ok) {
            console.error(`Traffic Tile API error: ${res.status}`);
            return new NextResponse('Error fetching tile', { status: res.status });
        }

        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Traffic Tile Proxy Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
