import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// In-memory storage for latest sensor data (fallback)
let latestSensorData = {
  temperature: 0,
  humidity: 0,
  fanSpeed: "OFF",
  timestamp: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate incoming data
    const temperature = parseFloat(body.temperature);
    const humidity = parseFloat(body.humidity) || 0;
    const fanSpeed = body.fanSpeed || "OFF";

    if (isNaN(temperature)) {
      return NextResponse.json(
        { error: "Invalid temperature value" },
        { status: 400 }
      );
    }

    // Update latest sensor data
    const sensorData = {
      temperature,
      humidity,
      fanSpeed: fanSpeed.toUpperCase(),
      timestamp: new Date().toISOString(),
    };

    latestSensorData = sensorData;

    // Store in MongoDB
    try {
      const db = await getDatabase();
      const collection = db.collection("sensor_readings");
      await collection.insertOne({
        ...sensorData,
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error("MongoDB error:", dbError);
      // Continue even if DB fails
    }

    return NextResponse.json({
      success: true,
      message: "Data received successfully",
      data: sensorData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: latestSensorData,
  });
}
