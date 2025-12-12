"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SensorData {
  temperature: number;
  humidity: number;
  fanSpeed: string;
  timestamp: string;
}

interface HistoricalDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  fanSpeed: number;
}

export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    fanSpeed: "OFF",
    timestamp: new Date().toISOString(),
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>(
    []
  );

  // Convert fan speed string to number
  const convertFanSpeedToNumber = (speed: string): number => {
    switch (speed.toUpperCase()) {
      case "OFF":
        return 0;
      case "LOW":
        return 33;
      case "MID":
        return 66;
      case "MAX":
        return 100;
      default:
        return 0;
    }
  };

  // Initialize with some sample data points
  useEffect(() => {
    const initialData: HistoricalDataPoint[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 2 * 60 * 1000); // 2 minutes apart
      initialData.push({
        time: time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        temperature: 20 + Math.random() * 10,
        humidity: 50 + Math.random() * 20,
        fanSpeed: [0, 33, 66, 100][Math.floor(Math.random() * 4)], // OFF, LOW, MID, MAX
      });
    }
    setHistoricalData(initialData);
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await fetch("/api/sensor-data");
      const result = await response.json();

      if (result.success && result.data) {
        setSensorData(result.data);
        setIsConnected(true);
        const updateTime = new Date(result.data.timestamp).toLocaleTimeString();
        setLastUpdate(updateTime);

        // Add new data point to historical data
        setHistoricalData((prev) => {
          const newData = [
            ...prev,
            {
              time: updateTime,
              temperature: result.data.temperature,
              humidity: result.data.humidity,
              fanSpeed: convertFanSpeedToNumber(result.data.fanSpeed),
            },
          ];
          // Keep only last 24 data points (48 minutes of data at 2s intervals)
          return newData.slice(-24);
        });
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 2000);
    const dateInterval = setInterval(() => setCurrentDate(new Date()), 60000);

    return () => {
      clearInterval(interval);
      clearInterval(dateInterval);
    };
  }, []);

  const getFanSpeedColor = (speed: string) => {
    switch (speed.toUpperCase()) {
      case "LOW":
        return "from-blue-400 to-blue-500";
      case "MID":
        return "from-yellow-400 to-orange-500";
      case "MAX":
        return "from-red-400 to-red-600";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  const getTemperatureIcon = (temp: number) => {
    if (temp <= 25) return "🌤️";
    if (temp <= 27) return "⛅";
    return "☀️";
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Calculate percentage change for the last data point
  const getPercentageChange = (type: "temperature" | "humidity") => {
    if (historicalData.length < 2) return 0;
    const current = historicalData[historicalData.length - 1][type];
    const previous = historicalData[historicalData.length - 2][type];
    const change = ((current - previous) / previous) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-blue-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Project Title */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            Smart Fan Control System
          </h1>
          <p className="text-lg text-gray-600">
            Temperature & Humidity Controlled IoT Dashboard
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Date & Time Card */}
          <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {formatDate(currentDate)}
              </div>
              <div className="text-5xl font-bold text-gray-800 mb-4">
                {formatTime(currentDate)}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {getTemperatureIcon(sensorData.temperature)}
                </div>
                <div className="text-4xl font-semibold text-gray-800">
                  {sensorData.temperature.toFixed(0)}°C
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-gray-600">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-2xl">
                💧
              </div>
              <div className="text-lg font-semibold text-gray-700">
                Humidity
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient-humidity)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 56 * (1 - sensorData.humidity / 100)
                    }`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient
                      id="gradient-humidity"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-800">
                      {sensorData.humidity.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Control Thresholds Card */}
          <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">⚙️</div>
              <div className="text-lg font-semibold text-gray-700">
                Control Thresholds
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-3 w-full">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Temp Threshold 1
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    25°C
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Temp Threshold 2
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    27°C
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Humidity Threshold 1
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    40%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Humidity Threshold 2
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    60%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Update Rate</span>
                  <span className="text-sm font-semibold text-gray-800">
                    2s
                  </span>
                </div>
                {lastUpdate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Update</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {lastUpdate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fan Control Card - Large */}
          <div className="md:col-span-2 backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-8 border border-white/50 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center text-2xl">
                🌀
              </div>
              <div className="text-xl font-semibold text-gray-700">
                Smart Fan Control
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Fan Speed Display */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative w-48 h-48">
                  <svg className="transform -rotate-90 w-48 h-48">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="#e5e7eb"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="url(#gradient-fan)"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${
                        2 *
                        Math.PI *
                        88 *
                        (1 -
                          (sensorData.fanSpeed === "LOW"
                            ? 0.33
                            : sensorData.fanSpeed === "MID"
                            ? 0.66
                            : sensorData.fanSpeed === "MAX"
                            ? 1
                            : 0))
                      }`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient
                        id="gradient-fan"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor={
                            sensorData.fanSpeed === "LOW"
                              ? "#60a5fa"
                              : sensorData.fanSpeed === "MID"
                              ? "#fbbf24"
                              : "#ef4444"
                          }
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            sensorData.fanSpeed === "LOW"
                              ? "#3b82f6"
                              : sensorData.fanSpeed === "MID"
                              ? "#f97316"
                              : "#dc2626"
                          }
                        />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold text-gray-800 mb-1">
                      {sensorData.fanSpeed === "LOW"
                        ? "33"
                        : sensorData.fanSpeed === "MID"
                        ? "66"
                        : sensorData.fanSpeed === "MAX"
                        ? "100"
                        : "0"}
                      %
                    </div>
                    <div className="text-sm text-gray-600">Intensity</div>
                  </div>
                </div>
              </div>

              {/* Speed Options */}
              <div className="flex justify-center gap-4">
                {["OFF", "LOW", "MID", "MAX"].map((speed) => (
                  <div
                    key={speed}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                      sensorData.fanSpeed.toUpperCase() === speed
                        ? "bg-gradient-to-r " +
                          getFanSpeedColor(speed) +
                          " text-white shadow-lg scale-105"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {speed}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Temperature Card */}
          <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-2xl">🌡️</div>
              <div className="text-lg font-semibold text-gray-700">
                Temperature
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center mb-4">
              <div className="relative w-40 h-40">
                <svg className="transform -rotate-90 w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="url(#gradient-temp)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${
                      2 *
                      Math.PI *
                      70 *
                      (1 -
                        Math.min(Math.max(sensorData.temperature / 100, 0), 1))
                    }`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient
                      id="gradient-temp"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl mb-2">☁️</div>
                  <div className="text-4xl font-bold text-gray-800">
                    {sensorData.temperature.toFixed(0)}°
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-600 px-2">
              <span>0°</span>
              <span>100°</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Temperature Chart */}
          <div className="backdrop-blur-md bg-gradient-to-br from-orange-400/20 via-amber-300/20 to-orange-500/20 rounded-[32px] shadow-lg p-6 border border-orange-200/50">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                Temperature Overview
              </h2>
              <p className="text-sm text-green-600 font-medium">
                {getPercentageChange("temperature")} change this period
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={historicalData}>
                <defs>
                  <linearGradient
                    id="colorTemperature"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  domain={[15, 35]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#colorTemperature)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Humidity Chart */}
          <div className="backdrop-blur-md bg-gradient-to-br from-blue-400/20 via-cyan-300/20 to-blue-500/20 rounded-[32px] shadow-lg p-6 border border-blue-200/50">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                Humidity Overview
              </h2>
              <p className="text-sm text-green-600 font-medium">
                {getPercentageChange("humidity")} change this period
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={historicalData}>
                <defs>
                  <linearGradient
                    id="colorHumidity"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorHumidity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Combined Chart */}
          <div className="lg:col-span-2 backdrop-blur-md bg-gradient-to-br from-purple-400/20 via-indigo-300/20 to-purple-500/20 rounded-[32px] shadow-lg p-6 border border-purple-200/50">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                Temperature & Humidity & Fan Speed Combined Overview
              </h2>
              <p className="text-sm text-gray-600">
                Real-time monitoring of sensors and fan speed
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalData}>
                <defs>
                  <linearGradient
                    id="colorTempCombined"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient
                    id="colorHumidityCombined"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient
                    id="colorFanSpeedCombined"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  yAxisId="temp"
                  stroke="#f97316"
                  style={{ fontSize: "12px" }}
                  domain={[15, 35]}
                  label={{
                    value: "Temp (°C)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                />
                <YAxis
                  yAxisId="humidity"
                  orientation="right"
                  stroke="#3b82f6"
                  style={{ fontSize: "12px" }}
                  domain={[0, 100]}
                  label={{
                    value: "Humidity (%) / Speed (%)",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle" },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number | string, name: string) => {
                    if (name === "Fan Speed (%)") {
                      const numValue =
                        typeof value === "number"
                          ? value
                          : parseFloat(value as string);
                      const speedLabels: { [key: number]: string } = {
                        0: "OFF",
                        33: "LOW",
                        66: "MID",
                        100: "MAX",
                      };
                      return [`${speedLabels[numValue] || numValue}%`, name];
                    }
                    if (name === "Temperature (°C)") {
                      return [
                        `${
                          typeof value === "number" ? value.toFixed(1) : value
                        }°C`,
                        name,
                      ];
                    }
                    if (name === "Humidity (%)") {
                      return [
                        `${
                          typeof value === "number" ? value.toFixed(1) : value
                        }%`,
                        name,
                      ];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#colorTempCombined)"
                  name="Temperature (°C)"
                />
                <Area
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorHumidityCombined)"
                  name="Humidity (%)"
                />
                <Area
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="fanSpeed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorFanSpeedCombined)"
                  name="Fan Speed (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
