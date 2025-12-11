'use client';

import { useEffect, useState } from 'react';

interface SensorData {
  temperature: number;
  humidity: number;
  fanSpeed: string;
  timestamp: string;
}

export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    fanSpeed: 'OFF',
    timestamp: new Date().toISOString(),
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchSensorData = async () => {
    try {
      const response = await fetch('/api/sensor-data');
      const result = await response.json();
      
      if (result.success && result.data) {
        setSensorData(result.data);
        setIsConnected(true);
        setLastUpdate(new Date(result.data.timestamp).toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Fetch data immediately
    fetchSensorData();
    
    // Set up polling every 2 seconds (matching ESP32 delay)
    const interval = setInterval(fetchSensorData, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const getFanSpeedColor = (speed: string) => {
    switch (speed.toUpperCase()) {
      case 'LOW':
        return 'bg-blue-500';
      case 'MID':
        return 'bg-yellow-500';
      case 'MAX':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 25) return 'text-blue-600';
    if (temp <= 27) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp <= 25) return 'Cool';
    if (temp <= 27) return 'Moderate';
    return 'Hot';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Temperature & Humidity Controlled Fan System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time IoT Monitoring Dashboard
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {lastUpdate && (
              <span className="text-sm text-gray-500 dark:text-gray-500">
                • Last update: {lastUpdate}
              </span>
            )}
          </div>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Temperature Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Temperature
              </h2>
              <div className="text-2xl">🌡️</div>
            </div>
            <div className="text-center">
              <div
                className={`text-6xl font-bold mb-2 ${getTemperatureColor(
                  sensorData.temperature
                )}`}
              >
                {sensorData.temperature.toFixed(1)}
                <span className="text-3xl text-gray-500 dark:text-gray-400">
                  °C
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Status: {getTemperatureStatus(sensorData.temperature)}
              </div>
            </div>
            {/* Temperature Gauge Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    sensorData.temperature <= 25
                      ? 'bg-blue-500'
                      : sensorData.temperature <= 27
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min((sensorData.temperature / 35) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0°C</span>
                <span>35°C</span>
              </div>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Humidity
              </h2>
              <div className="text-2xl">💧</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold mb-2 text-cyan-600">
                {sensorData.humidity.toFixed(1)}
                <span className="text-3xl text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Relative Humidity
              </div>
            </div>
            {/* Humidity Gauge Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(sensorData.humidity, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Fan Speed Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Fan Speed
              </h2>
              <div className="text-2xl">🌀</div>
            </div>
            <div className="text-center">
              <div
                className={`inline-block px-6 py-3 rounded-full text-2xl font-bold text-white mb-2 ${getFanSpeedColor(
                  sensorData.fanSpeed
                )}`}
              >
                {sensorData.fanSpeed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Current Status
              </div>
            </div>
            {/* Fan Speed Indicator */}
            <div className="mt-4 flex justify-center">
              <div className="flex gap-2">
                {['LOW', 'MID', 'MAX'].map((speed) => (
                  <div
                    key={speed}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      sensorData.fanSpeed.toUpperCase() === speed
                        ? getFanSpeedColor(speed) + ' text-white scale-110'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {speed}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            System Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Temperature Threshold 1
              </p>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">
                25°C
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Temperature Threshold 2
              </p>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">
                27°C
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fan Speed Logic
              </p>
              <p className="text-sm text-gray-800 dark:text-white">
                ≤25°C: LOW | 25-27°C: MID | &gt;27°C: MAX
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update Frequency
              </p>
              <p className="text-sm text-gray-800 dark:text-white">
                Every 2 seconds
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Make sure your ESP32 is connected to WiFi and
            sending data to this dashboard. The ESP32 should POST sensor data to{' '}
            <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
              /api/sensor-data
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
