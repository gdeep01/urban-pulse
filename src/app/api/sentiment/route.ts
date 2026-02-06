import { NextRequest, NextResponse } from 'next/server';
import { classifySentiment, SentimentResult } from '@/lib/openrouter';
import { normalizeSentiment, aggregateSentiments } from '@/lib/normalizers';

interface SentimentData {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    sources: Array<{
        source: string;
        text: string;
        label: string;
        confidence: number;
        user?: string;
    }>;
    lastUpdated: string;
}

// REAL WORLD CONTEXT (Feb 2026) - Gathered from live search
const CITY_CONTEXTS: Record<string, string[]> = {
    'bangalore': [
        "Gridlock at Iblur Junction and Outer Ring Road bottlenecks.",
        "Frustration over pot-holed roads in industrial corridors.",
        "Recent power cuts in various neighborhoods slowing down life.",
        "BMTC fleet shrinking causing longer wait times for public transport."
    ],
    'mumbai': [
        "Massive 33-hour traffic jam on Mumbai-Pune Expressway due to gas tanker accident.",
        "New traffic rules effective Feb 1st restricting heavy vehicles during peak hours.",
        "Luxury bus ban in South Mumbai causing commute shifts.",
        "Dry February weather - no rain impact on roads currently."
    ],
    'delhi': [
        "AQI consistently in 'Very Poor' category (300-400 range).",
        "Traffic diversions for Republic Day rehearsals and upcoming events.",
        "Queer Pride Parade prep in Central Delhi affecting weekend routes.",
        "Frustration among working class over lack of air purifiers."
    ]
};

async function getRealisticTwitterPosts(cityName: string): Promise<{ text: string, user: string }[]> {
    const context = CITY_CONTEXTS[cityName.toLowerCase()] || ["General urban pulse and traffic conditions."];
    // In a real scenario, we'd run the python scraper here. 
    // Since scraping is currently unstable due to Twitter changes, we use AI to simulate 
    // high-fidelity 'Human Sentiment' based on real-world events we just searched.

    // We'll return 3 realistic posts
    const users = ['@urban_warrior', '@city_life_in', '@traffic_buzz', '@commuter_diaries', '@daily_pulse'];

    // For now, we use the context as seeds but since we want 'Realistic', 
    // we'll use a prompt to generate them if OpenRouter is available, else mock.
    return context.slice(0, 3).map((c, i) => ({
        text: `RT: ${c} #CityPulse #${cityName}`,
        user: users[i % users.length]
    }));
}

// In-memory cache with previous score for dampening
let cache: {
    data: SentimentData;
    timestamp: number;
    city: string;
    prevScore: number;
} | null = null;

const CACHE_DURATION = 30000; // Reduced to 30s for better 'live' feel
const DAMPENING_FACTOR = 0.7; // 70% current, 30% previous

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const cityName = searchParams.get('city') || 'Bangalore';

    // Check cache for strict HIT (same city, within 30s)
    if (cache && cache.city.toLowerCase() === cityName.toLowerCase() && Date.now() - cache.timestamp < CACHE_DURATION) {
        return NextResponse.json(cache.data, {
            headers: { 'X-Cache': 'HIT' },
        });
    }

    try {
        // Get more texts for better averaging (5 instead of 3)
        const context = CITY_CONTEXTS[cityName.toLowerCase()] || ["General traffic and city pulse conditions."];
        const rawPosts = context.map((c, i) => ({
            text: `RT: ${c} #CityPulse #${cityName} ${i}`,
            user: `@user_${i}`
        })).slice(0, 5);

        const texts = rawPosts.map(p => p.text);

        // Classify using OpenRouter
        const sentiments = await classifySentiment(texts, cityName);

        // Normalize and aggregate scores
        const normalizedScores = sentiments.map((s) => ({
            score: normalizeSentiment(s.label, s.confidence),
            weight: s.confidence,
        }));

        let aggregatedScore = aggregateSentiments(normalizedScores);

        // APPLY DAMPENING to prevent sudden jumps
        if (cache && cache.city.toLowerCase() === cityName.toLowerCase()) {
            aggregatedScore = Math.round(
                aggregatedScore * DAMPENING_FACTOR +
                cache.prevScore * (1 - DAMPENING_FACTOR)
            );
        }

        // Determine overall label
        const overallLabel = aggregatedScore >= 60 ? 'positive' :
            aggregatedScore >= 40 ? 'neutral' : 'negative';

        const data: SentimentData = {
            score: aggregatedScore,
            label: overallLabel,
            sources: rawPosts.map((post, i) => ({
                source: 'Twitter (Realistic Simulation)',
                text: post.text,
                user: post.user,
                label: sentiments[i]?.label || 'neutral',
                confidence: sentiments[i]?.confidence || 0.5,
            })),
            lastUpdated: new Date().toISOString(),
        };

        // Update cache with current score for next round's dampening
        cache = {
            data,
            timestamp: Date.now(),
            city: cityName,
            prevScore: aggregatedScore
        };

        return NextResponse.json(data, {
            headers: { 'X-Cache': 'MISS' },
        });
    } catch (error) {
        console.error('Sentiment API error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
