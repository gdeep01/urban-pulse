
export interface DataPoint {
    time: number; // timestamp
    value: number; // pulse score
}

export interface PredictionPoint {
    time: string; // ISO string
    value: number;
    confidence: number; // 0-1
}

/**
 * Predicts future pulse scores using simple linear regression on recent history.
 * @param history Array of historical data points (timestamp, value)
 * @param horizonMinutes How far into the future to predict (default 120 mins)
 * @param intervalMinutes Interval between prediction points (default 15 mins)
 */
export function predictPulse(
    history: DataPoint[],
    horizonMinutes: number = 120,
    intervalMinutes: number = 15
): PredictionPoint[] {
    if (history.length < 2) {
        // Not enough data, return flat line based on last point or default
        const lastVal = history[0]?.value || 50;
        return generateFlatPrediction(lastVal, horizonMinutes, intervalMinutes);
    }

    // Use last 10 points or all available if less, to capture recent trend
    const recentHistory = history.slice(-10);

    if (recentHistory.length < 2) {
        return generateFlatPrediction(history[0]?.value || 50, horizonMinutes, intervalMinutes);
    }

    // Simple Linear Regression: y = mx + b
    const n = recentHistory.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    // Normalize time to minutes from start of window to avoid huge numbers
    const startTime = recentHistory[0].time;

    recentHistory.forEach(point => {
        const x = (point.time - startTime) / 60000; // minutes
        const y = point.value;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate future points
    const points: PredictionPoint[] = [];
    const lastTime = history[history.length - 1].time;
    const lastX = (lastTime - startTime) / 60000;

    for (let i = 1; i <= horizonMinutes / intervalMinutes; i++) {
        const futureMinutes = i * intervalMinutes;
        const futureX = lastX + futureMinutes;

        // Calculate predicted value
        let predictedValue = slope * futureX + intercept;

        // Dampen the slope over time (regression to mean) - predictions shouldn't go to infinity
        // The further out, the more we pull towards the mean (50) or the last known value
        const dampingFactor = Math.min(1, futureMinutes / 180); // Full damping after 3 hours
        if (Math.abs(slope) > 0.5) {
            // If trend is steep, dampen it
            predictedValue = predictedValue * (1 - dampingFactor) + 50 * dampingFactor;
        }

        // Clamp between 0-100
        predictedValue = Math.max(0, Math.min(100, predictedValue));

        // Confidence decreases with time
        const confidence = Math.max(0.1, 1 - (futureMinutes / horizonMinutes) * 0.8);

        points.push({
            time: new Date(lastTime + futureMinutes * 60000).toISOString(),
            value: Math.round(predictedValue),
            confidence: parseFloat(confidence.toFixed(2))
        });
    }

    return points;
}

function generateFlatPrediction(baseValue: number, horizonMinutes: number, intervalMinutes: number): PredictionPoint[] {
    const points: PredictionPoint[] = [];
    const now = Date.now();

    for (let i = 1; i <= horizonMinutes / intervalMinutes; i++) {
        points.push({
            time: new Date(now + i * intervalMinutes * 60000).toISOString(),
            value: baseValue,
            confidence: 0.5
        });
    }
    return points;
}
