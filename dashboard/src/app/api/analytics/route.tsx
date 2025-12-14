import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// Descriptive Analytics
function calculateDescriptiveStats(data: number[]) {
  if (data.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, variance: 0 };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  const variance =
    data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    min: Math.min(...data),
    max: Math.max(...data),
    stdDev: parseFloat(stdDev.toFixed(2)),
    variance: parseFloat(variance.toFixed(2)),
    count: data.length,
  };
}

// Diagnostic Analytics - Correlation
function calculateCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );
  return denominator === 0 ? 0 : numerator / denominator;
}

// Diagnostic Analytics - Trend
function calculateTrend(data: number[]) {
  if (data.length < 2) return 0;
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;

  // Scale the trend to be more meaningful (per 1000 data points)
  // This helps when dealing with aggregated hourly data
  const scaledSlope = slope * 1000;

  return parseFloat(scaledSlope.toFixed(4));
}

// Diagnostic Analytics - Heat Index
function calculateHeatIndex(temp: number, humidity: number) {
  if (temp < 27 || humidity < 40) return temp;
  const hi =
    -8.78469475556 +
    1.61139411 * temp +
    2.33854883889 * humidity +
    -0.14611605 * temp * humidity +
    -0.012308094 * temp * temp +
    -0.0164248277778 * humidity * humidity +
    0.002211732 * temp * temp * humidity +
    0.00072546 * temp * humidity * humidity +
    -0.000003582 * temp * temp * humidity * humidity;
  return parseFloat(hi.toFixed(2));
}

// Predictive Analytics - Linear Regression Forecast
function predictNextValue(data: number[], stepsAhead: number = 1) {
  if (data.length < 2) return data[data.length - 1] || 0;
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return parseFloat((intercept + slope * (n + stepsAhead - 1)).toFixed(2));
}

// Predictive Analytics - Moving Average
function calculateMovingAverage(data: number[], window: number = 5) {
  if (data.length < window) return data[data.length - 1] || 0;
  const recent = data.slice(-window);
  return parseFloat(
    (recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(2)
  );
}

export async function GET() {
  try {
    const db = await getDatabase();

    // Fetch ONLY dataset data for analytics (ALL records, no limit)
    const datasetData = await db
      .collection("dataset_readings")
      .find({})
      .sort({ datetime: 1 }) // Sort ascending for proper trend analysis
      .toArray(); // NO LIMIT - use ALL dataset records

    // Prepare data arrays from dataset only
    const allTempData: number[] = [];
    const allHumidityData: number[] = [];
    const allFanSpeedData: number[] = [];

    datasetData.forEach((item) => {
      const doc = item as unknown as {
        temperature: number;
        humidity: number;
        speed?: number;
      };
      allTempData.push(doc.temperature);
      allHumidityData.push(doc.humidity);
      allFanSpeedData.push(doc.speed || 0);
    });

    if (allTempData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No dataset data available for analytics",
        analytics: null,
      });
    }

    // Descriptive Analytics
    const tempStats = calculateDescriptiveStats(allTempData);
    const humidityStats = calculateDescriptiveStats(allHumidityData);
    const fanSpeedStats = calculateDescriptiveStats(allFanSpeedData);

    // Diagnostic Analytics
    const tempHumidityCorr = calculateCorrelation(allTempData, allHumidityData);
    const tempFanSpeedCorr = calculateCorrelation(allTempData, allFanSpeedData);
    const humidityFanSpeedCorr = calculateCorrelation(
      allHumidityData,
      allFanSpeedData
    );

    const tempTrend = calculateTrend(allTempData);
    const humidityTrend = calculateTrend(allHumidityData);

    // Use latest dataset values for heat index
    const currentTemp = datasetData[datasetData.length - 1]?.temperature || 0;
    const currentHumidity = datasetData[datasetData.length - 1]?.humidity || 0;
    const currentHeatIndex = calculateHeatIndex(currentTemp, currentHumidity);

    // Predictive Analytics
    const predictedTemp = predictNextValue(allTempData, 1);
    const predictedHumidity = predictNextValue(allHumidityData, 1);
    const tempMovingAvg = calculateMovingAverage(allTempData, 5);
    const humidityMovingAvg = calculateMovingAverage(allHumidityData, 5);

    // Optimal Fan Speed Prediction
    const predictOptimalFanSpeed = (temp: number, humidity: number) => {
      if (temp <= 25) return 0;
      if (temp <= 27 && humidity <= 60) return 33;
      if (temp <= 27 || (temp <= 29 && humidity <= 70)) return 66;
      return 100;
    };

    const predictedOptimalSpeed = predictOptimalFanSpeed(
      predictedTemp,
      predictedHumidity
    );

    return NextResponse.json({
      success: true,
      analytics: {
        descriptive: {
          temperature: tempStats,
          humidity: humidityStats,
          fanSpeed: fanSpeedStats,
        },
        diagnostic: {
          correlations: {
            tempHumidity: parseFloat(tempHumidityCorr.toFixed(4)),
            tempFanSpeed: parseFloat(tempFanSpeedCorr.toFixed(4)),
            humidityFanSpeed: parseFloat(humidityFanSpeedCorr.toFixed(4)),
          },
          trends: {
            temperature: tempTrend,
            humidity: humidityTrend,
          },
          heatIndex: currentHeatIndex,
        },
        predictive: {
          forecast: {
            temperature: predictedTemp,
            humidity: predictedHumidity,
          },
          movingAverages: {
            temperature: tempMovingAvg,
            humidity: humidityMovingAvg,
          },
          optimalFanSpeed: predictedOptimalSpeed,
        },
        dataPoints: {
          total: allTempData.length,
          realtime: 0, // Analytics uses only dataset
          dataset: datasetData.length,
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to calculate analytics";
    console.error("Analytics error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
