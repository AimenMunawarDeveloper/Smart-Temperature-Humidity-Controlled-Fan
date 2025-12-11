import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for sensor data
// In production, you'd use a database
let latestSensorData = {
  temperature: 0,
  humidity: 0,
  fanSpeed: 'OFF',
  timestamp: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate incoming data
    const temperature = parseFloat(body.temperature);
    const humidity = parseFloat(body.humidity) || 0; // Optional for now
    const fanSpeed = body.fanSpeed || 'OFF';
    
    if (isNaN(temperature)) {
      return NextResponse.json(
        { error: 'Invalid temperature value' },
        { status: 400 }
      );
    }
    
    // Update latest sensor data
    latestSensorData = {
      temperature,
      humidity,
      fanSpeed: fanSpeed.toUpperCase(),
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      data: latestSensorData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
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

