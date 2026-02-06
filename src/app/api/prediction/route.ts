
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { predictPulse } from '@/lib/prediction';
import { explainForecast } from '@/lib/openrouter';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    // Note: cityId can be used for per-city history queries in future
    const cityName = searchParams.get('cityName') || 'Bangalore';

    // NOTE: In a real app, we'd query by city_id from cities table

    const supabase = createServerClient();

    try {
        let history: any[] = [];
        try {
            // 1. Fetch last 24h of history for context (limit 96 for 15m intervals)
            // For MVP, we'll fetch last 20 points to detect immediate trend
            const { data, error } = await supabase
                .from('city_metrics')
                .select('pulse_score, traffic_score, weather_score, sentiment_score, timestamp')
                .order('timestamp', { ascending: true })
                .limit(30);

            if (error) throw error;
            history = data;
        } catch (dbError) {
            console.warn('DB fetch failed, using mock history:', dbError);
            history = [];
        }

        // Transform to DataPoints
        const dataPoints = (history || []).map(h => ({
            time: new Date(h.timestamp).getTime(),
            value: h.pulse_score,
        }));

        // If no history (fresh app), mock some history
        if (dataPoints.length < 2) {
            const now = Date.now();
            for (let i = 10; i >= 0; i--) {
                dataPoints.push({
                    time: now - i * 60000 * 15,
                    value: 50 + Math.sin(i) * 10
                });
            }
        }

        // 2. Generate Prediction
        const forecast = predictPulse(dataPoints, 120, 15); // Next 2 hours, 15m intervals

        // 3. Explain Forecast
        const current = dataPoints[dataPoints.length - 1].value;
        const future = forecast[forecast.length - 1].value;

        // Get latest factor scores for explanation
        const lastRec = history?.[history.length - 1] || {
            traffic_score: 50, weather_score: 50, sentiment_score: 50
        };

        const explanation = await explainForecast(cityName, current, future, {
            traffic: lastRec.traffic_score,
            weather: lastRec.weather_score,
            sentiment: lastRec.sentiment_score
        });

        return NextResponse.json({
            forecast,
            explanation,
            trend: future > current ? 'improving' : future < current ? 'declining' : 'stable'
        }, {
            headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
        });

    } catch (error) {
        console.error('Prediction API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate prediction' },
            { status: 500 }
        );
    }
}
