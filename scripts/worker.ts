import { createServerClient } from '../src/lib/supabase';
import { fetchTrafficData, fetchWeatherData } from '../src/lib/data-fetchers';
import { PulseService } from '../src/lib/services/pulse-service';
import { classifySentiment } from '../src/lib/openrouter';
import { normalizeSentiment, aggregateSentiments } from '../src/lib/normalizers';
import { detectAnomalies } from '../src/lib/events';

// Load environment variables for standalone script
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: '.env.local' });
}

// Polyfill fetch for Node.js environment if needed (Next.js 15 usually handles this, but good for standalone)
if (!global.fetch) {
    // @ts-ignore
    global.fetch = require('node-fetch');
}

async function runWorker() {
    console.log('🚀 Starting Urban Pulse Worker...');
    const startTime = Date.now();

    try {
        // 1. Initialize Supabase Client (Service Role)
        const supabase = createServerClient();

        // 2. Fetch all cities
        const { data: cities, error: cityError } = await supabase
            .from('cities')
            .select('*');

        if (cityError) throw new Error(`Failed to fetch cities: ${cityError.message}`);
        console.log(`📍 Processing ${cities.length} cities...`);

        for (const city of cities) {
            console.log(`\nAnalyzing ${city.name}...`);

            try {
                // 3. Parallel Data Fetching
                const [traffic, weather, sentiments] = await Promise.all([
                    fetchTrafficData(city.lat, city.lng, city.name),
                    fetchWeatherData(city.lat, city.lng),
                    // Mocking texts for now - in prod would fetch from Reddit/News
                    Promise.resolve([
                        `${city.name} needs better public transport`,
                        `Beautiful sunset in ${city.name} today`,
                        `Traffic on main street is terrible`,
                    ])
                ]);

                // 4. Sentiment Classification
                const classifiedSentiments = await classifySentiment(sentiments, city.name);
                const normalizedSentiments = classifiedSentiments.map(s => ({
                    score: normalizeSentiment(s.label, s.confidence),
                    weight: s.confidence
                }));
                const sentimentScore = aggregateSentiments(normalizedSentiments);

                // 5. Calculate Pulse
                const pulseResult = PulseService.calculatePulse({
                    traffic,
                    weather,
                    sentimentScore
                });

                // 6. Store Metric Snapshot
                const { error: insertError } = await supabase
                    .from('city_metrics')
                    .insert({
                        city_id: city.id,
                        traffic_score: pulseResult.trafficScore,
                        weather_score: pulseResult.weatherScore,
                        sentiment_score: pulseResult.sentimentScore,
                        pulse_score: pulseResult.pulse,
                        timestamp: new Date().toISOString()
                    });

                if (insertError) {
                    console.error(`❌ Failed to store metrics for ${city.name}:`, insertError.message);
                } else {
                    console.log(`✅ Stored snapshot: Pulse ${pulseResult.pulse} (T:${pulseResult.trafficScore} W:${pulseResult.weatherScore} S:${pulseResult.sentimentScore})`);
                }

                // 7. Event Detection
                // Fetch recent history for comparison
                const { data: history } = await supabase
                    .from('city_metrics')
                    .select('pulse_score, traffic_score, weather_score, sentiment_score, timestamp')
                    .eq('city_id', city.id)
                    .order('timestamp', { ascending: true })
                    .limit(5);

                const historyMetrics = (history || []).map(h => ({
                    pulse: h.pulse_score,
                    traffic: h.traffic_score,
                    weather: h.weather_score,
                    sentiment: h.sentiment_score,
                    timestamp: h.timestamp
                }));

                // Add current metric to history for detection (last item is current)
                const currentMetric = {
                    pulse: pulseResult.pulse,
                    traffic: pulseResult.trafficScore,
                    weather: pulseResult.weatherScore,
                    sentiment: pulseResult.sentimentScore,
                    timestamp: new Date().toISOString()
                };

                const anomalies = detectAnomalies(currentMetric, historyMetrics, city.id);

                if (anomalies.length > 0) {
                    console.log(`⚠️ Detected ${anomalies.length} anomalies for ${city.name}`);
                    const { error: eventError } = await supabase.from('events').insert(anomalies);
                    if (eventError) console.error('Failed to store events:', eventError.message);
                }

            } catch (err) {
                console.error(`❌ Error processing ${city.name}:`, err);
            }
        }

    } catch (error) {
        console.error('❌ Worker failed:', error);
        process.exit(1);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n🏁 Worker finished in ${duration.toFixed(2)}s`);
    process.exit(0);
}

// Run the worker
runWorker();
