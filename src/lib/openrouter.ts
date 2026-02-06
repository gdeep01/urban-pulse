const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface SentimentResult {
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
    explanation?: string;
}

/**
 * Classify sentiment using OpenRouter AI
 */
export async function classifySentiment(
    texts: string[],
    context?: string
): Promise<SentimentResult[]> {
    if (!OPENROUTER_API_KEY) {
        console.log('OpenRouter API key not configured, using mock sentiment');
        return texts.map(() => generateMockSentiment());
    }

    try {
        const prompt = `Analyze the sentiment of these texts about ${context || 'a city'}. 
For each text, respond with JSON array containing objects with:
- label: "positive", "neutral", or "negative"
- confidence: number 0-1
- explanation: brief reason

Texts to analyze:
${texts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Respond ONLY with valid JSON array, no other text.`;

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://urban-pulse.vercel.app',
                'X-Title': 'Urban Pulse',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a sentiment analysis expert. Respond only with valid JSON.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        // Parse JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in response');
        }

        const results = JSON.parse(jsonMatch[0]) as SentimentResult[];
        return results;
    } catch (error) {
        console.error('OpenRouter sentiment analysis failed:', error);
        return texts.map(() => generateMockSentiment());
    }
}

/**
 * Get AI-generated insight about city conditions
 */
export async function getCityInsight(
    cityName: string,
    trafficScore: number,
    weatherScore: number,
    sentimentScore: number
): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        return generateMockInsight(cityName, trafficScore, weatherScore, sentimentScore);
    }

    try {
        const prompt = `Generate a brief one-sentence insight about ${cityName}'s current conditions:
- Traffic score: ${trafficScore}/100 (higher = better flow)
- Weather score: ${weatherScore}/100 (higher = better conditions)  
- Sentiment score: ${sentimentScore}/100 (higher = more positive)

Be concise, insightful, and actionable.`;

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://urban-pulse.vercel.app',
                'X-Title': 'Urban Pulse',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 100,
            }),
        });

        if (!response.ok) throw new Error('API error');

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() ||
            generateMockInsight(cityName, trafficScore, weatherScore, sentimentScore);
    } catch {
        return generateMockInsight(cityName, trafficScore, weatherScore, sentimentScore);
    }
}

/**
 * Explain why the forecast is predicting a certain trend
 */
export async function explainForecast(
    cityName: string,
    currentPulse: number,
    predictedPulse: number,
    factors: { traffic: number; weather: number; sentiment: number }
): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        return generateMockForecastExplanation(currentPulse, predictedPulse);
    }

    try {
        const trend = predictedPulse > currentPulse ? 'improve' : predictedPulse < currentPulse ? 'decline' : 'remain stable';
        const diff = Math.abs(predictedPulse - currentPulse);

        // significant check removed as unused

        const prompt = `Explain in one short sentence why urban pulse in ${cityName} is predicted to ${trend} (from ${currentPulse} to ${predictedPulse}) over the next 2 hours.
Context:
- Current Traffic: ${factors.traffic}/100
- Current Weather: ${factors.weather}/100
- Sentiment: ${factors.sentiment}/100

Assume typical patterns: rush hour, weather impact, or social events.
If change is minor (<5 points), say conditions are stable.
Respond concisely.`;

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://urban-pulse.vercel.app',
                'X-Title': 'Urban Pulse',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free',
                messages: [
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 60,
            }),
        });

        if (!response.ok) throw new Error('API error');

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() ||
            generateMockForecastExplanation(currentPulse, predictedPulse);
    } catch {
        return generateMockForecastExplanation(currentPulse, predictedPulse);
    }
}

function generateMockSentiment(): SentimentResult {
    const labels: SentimentResult['label'][] = ['positive', 'neutral', 'negative'];
    const weights = [0.4, 0.4, 0.2]; // Slightly positive bias
    const random = Math.random();
    let cumulative = 0;
    let label: SentimentResult['label'] = 'neutral';

    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
            label = labels[i];
            break;
        }
    }

    return {
        label,
        confidence: 0.6 + Math.random() * 0.3,
        explanation: `Mock ${label} sentiment for development`,
    };
}

function generateMockInsight(
    city: string,
    traffic: number,
    weather: number,
    sentiment: number
): string {
    const avg = (traffic + weather + sentiment) / 3;

    if (avg >= 70) {
        return `${city} is experiencing excellent urban conditions - a great day to be out and about!`;
    }
    if (avg >= 50) {
        return `${city} shows moderate city pulse with ${traffic < 50 ? 'some traffic congestion' : 'manageable conditions'}.`;
    }
    return `${city} facing urban stress - consider flexible timing for travel if possible.`;
}

function generateMockForecastExplanation(current: number, predicted: number): string {
    const diff = predicted - current;

    if (Math.abs(diff) < 5) return "Conditions expected to remain stable with no major disruptions.";

    if (diff > 0) {
        return "Pulse expected to improve as traffic congestion eases after peak hours.";
    } else {
        return "Pulse may decline slightly due to accumulating traffic or weather changes.";
    }
}
