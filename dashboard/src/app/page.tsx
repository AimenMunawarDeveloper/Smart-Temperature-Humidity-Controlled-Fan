"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
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
  interface AnalyticsData {
    descriptive: {
      temperature: {
        mean: number;
        median: number;
        min: number;
        max: number;
        stdDev: number;
        variance: number;
        count: number;
      };
      humidity: {
        mean: number;
        median: number;
        min: number;
        max: number;
        stdDev: number;
        variance: number;
        count: number;
      };
      fanSpeed: {
        mean: number;
        median: number;
        min: number;
        max: number;
        stdDev: number;
        variance: number;
        count: number;
      };
    };
    diagnostic: {
      correlations: {
        tempHumidity: number;
        tempFanSpeed: number;
        humidityFanSpeed: number;
      };
      trends: { temperature: number; humidity: number };
      heatIndex: number;
    };
    predictive: {
      forecast: { temperature: number; humidity: number };
      movingAverages: { temperature: number; humidity: number };
      optimalFanSpeed: number;
    };
    dataPoints: { total: number; realtime: number; dataset: number };
  }
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics">(
    "dashboard"
  );
  const [datasetData, setDatasetData] = useState<HistoricalDataPoint[]>([]);

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

  // Fetch historical data from MongoDB (REALTIME/SENSOR DATA ONLY for Dashboard)
  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(
        "/api/historical-data?limit=500&source=realtime"
      );

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setHistoricalData(result.data);
      } else {
        // If API returns unsuccessful response, keep existing data or set empty array
        console.warn(
          "Historical data fetch unsuccessful, keeping existing data"
        );
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
      // Fallback: Keep existing historical data, or set empty array if no data exists
      // This prevents the dashboard from breaking when API is unavailable
      if (historicalData.length === 0) {
        setHistoricalData([]);
      }
    }
  };

  // Fetch dataset data for analytics graphs (ALL dataset records)
  const fetchDatasetData = async () => {
    try {
      // Fetch ALL dataset records (no limit) for analytics visualization
      const response = await fetch("/api/historical-data?source=dataset");

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setDatasetData(result.data);
      } else {
        // If API returns unsuccessful response, keep existing data
        console.warn("Dataset data fetch unsuccessful, keeping existing data");
      }
    } catch (error) {
      console.error("Error fetching dataset data:", error);
      // Fallback: Keep existing dataset data to prevent breaking analytics
    }
  };

  // Fetch analytics from MongoDB
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch("/api/analytics");

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.analytics) {
        setAnalytics(result.analytics);
      } else {
        // If API returns unsuccessful response, keep existing analytics
        console.warn("Analytics fetch unsuccessful, keeping existing data");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Fallback: Keep existing analytics data to prevent breaking UI
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Initialize: Fetch data based on active tab
  useEffect(() => {
    // Always fetch analytics (used in analytics tab)
    fetchAnalytics();
    fetchDatasetData();

    // Only fetch historical sensor data if on dashboard tab
    if (activeTab === "dashboard") {
      fetchHistoricalData();
    }

    // Refresh analytics every 30 seconds
    const analyticsInterval = setInterval(fetchAnalytics, 30000);
    const datasetInterval = setInterval(fetchDatasetData, 30000);

    return () => {
      clearInterval(analyticsInterval);
      clearInterval(datasetInterval);
    };
  }, [activeTab]);

  const fetchSensorData = async () => {
    try {
      const response = await fetch("/api/sensor-data");

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setSensorData(result.data);
        setIsConnected(true);
        const updateTime = new Date(result.data.timestamp).toLocaleTimeString();
        setLastUpdate(updateTime);

        // Refresh historical data from MongoDB (includes new data point) - only if on dashboard tab
        if (activeTab === "dashboard") {
          fetchHistoricalData();
        }
      } else {
        // API returned unsuccessful response
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setIsConnected(false);
      // Keep existing sensor data as fallback to prevent UI breaking
    }
  };

  useEffect(() => {
    // Only fetch sensor data and historical data when on dashboard tab
    if (activeTab === "dashboard") {
      fetchSensorData();
      fetchHistoricalData();

      const interval = setInterval(fetchSensorData, 2000);
      const dateInterval = setInterval(() => setCurrentDate(new Date()), 60000);
      const historicalInterval = setInterval(fetchHistoricalData, 10000); // Refresh every 10s

      return () => {
        clearInterval(interval);
        clearInterval(dateInterval);
        clearInterval(historicalInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  // Calculate change over the period (first to last data point)
  const getPercentageChange = (type: "temperature" | "humidity") => {
    if (historicalData.length < 2) return "0.0%";
    const first = historicalData[0][type];
    const last = historicalData[historicalData.length - 1][type];

    // Avoid division by zero - if first value is 0 or very close to 0, show absolute change
    if (Math.abs(first) < 0.01) {
      const absoluteChange = last - first;
      if (type === "temperature") {
        return absoluteChange > 0
          ? `+${absoluteChange.toFixed(1)}°C`
          : `${absoluteChange.toFixed(1)}°C`;
      } else {
        return absoluteChange > 0
          ? `+${absoluteChange.toFixed(1)} %RH`
          : `${absoluteChange.toFixed(1)} %RH`;
      }
    }

    const change = ((last - first) / first) * 100;
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

        {/* Tab Navigation */}
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-8 py-3 rounded-full font-semibold text-lg transition-all duration-300 ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-lg scale-105"
                : "bg-white/70 text-gray-700 hover:bg-white/90"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-8 py-3 rounded-full font-semibold text-lg transition-all duration-300 ${
              activeTab === "analytics"
                ? "bg-gradient-to-r from-purple-400 to-indigo-500 text-white shadow-lg scale-105"
                : "bg-white/70 text-gray-700 hover:bg-white/90"
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Dashboard Tab Content */}
        {activeTab === "dashboard" && (
          <>
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
                        isConnected
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500"
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
                        <div className="text-2xl font-bold text-gray-800 leading-tight">
                          {sensorData.humidity.toFixed(1)}
                        </div>
                        <div className="text-sm font-semibold text-gray-600 mt-0.5">
                          %RH
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
                        40 %RH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Humidity Threshold 2
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        60 %RH
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
                        <span className="text-sm text-gray-600">
                          Last Update
                        </span>
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
                            Math.min(
                              Math.max(sensorData.temperature / 100, 0),
                              1
                            ))
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
                        {sensorData.temperature.toFixed(0)}°C
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
                  <AreaChart
                    data={historicalData}
                    margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorTemperature"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0.1}
                        />
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
                      labelStyle={{ color: "#000000" }}
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
                  <AreaChart
                    data={historicalData}
                    margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorHumidity"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0.1}
                        />
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
                      labelStyle={{ color: "#000000" }}
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
                  <AreaChart
                    data={historicalData}
                    margin={{ left: 60, right: 80, top: 10, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorTempCombined"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorHumidityCombined"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorFanSpeedCombined"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.05}
                        />
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
                      width={60}
                      label={{
                        value: "Temp (°C)",
                        angle: -90,
                        position: "left",
                        style: { textAnchor: "middle" },
                      }}
                    />
                    <YAxis
                      yAxisId="humidity"
                      orientation="right"
                      stroke="#3b82f6"
                      style={{ fontSize: "12px" }}
                      domain={[0, 100]}
                      width={80}
                      label={{
                        value: "Humidity (%RH) / Speed",
                        angle: 90,
                        position: "right",
                        style: { textAnchor: "middle" },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#000000" }}
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
                          return [
                            speedLabels[numValue] || numValue.toString(),
                            "Fan Speed",
                          ];
                        }
                        if (name === "Temperature (°C)") {
                          return [
                            `${
                              typeof value === "number"
                                ? value.toFixed(1)
                                : value
                            }°C`,
                            name,
                          ];
                        }
                        if (name === "Humidity (%)") {
                          return [
                            `${
                              typeof value === "number"
                                ? value.toFixed(1)
                                : value
                            } %RH`,
                            "Humidity",
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
                      name="Humidity (%RH)"
                    />
                    <Area
                      yAxisId="humidity"
                      type="monotone"
                      dataKey="fanSpeed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorFanSpeedCombined)"
                      name="Fan Speed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Analytics Tab Content */}
        {activeTab === "analytics" && (
          <div className="mb-8">
            {/* Dataset Information */}
            <div className="mb-6 backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Dataset Information
              </h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  <span className="font-semibold text-gray-800">
                    Dataset Name:
                  </span>{" "}
                  <span className="text-gray-900">
                    Dataset of Usage Pattern and Energy Analysis of an Internet
                    of Things-enabled Ceiling Fan
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Source:</span>{" "}
                  <a
                    href="https://data.mendeley.com/datasets/sr7t6xfh8w/2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 hover:underline font-semibold"
                  >
                    Mendeley Data
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-gray-800">
                    Description:
                  </span>{" "}
                  <span className="text-gray-700">
                    This dataset contains timestamped records of temperature,
                    humidity, and fan speed data from BLDC ceiling fans located
                    in bedrooms, living rooms, and lounges. The data is used to
                    enhance our analytics with a larger volume of historical
                    sensor readings.
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Data Points:</span>{" "}
                  {analytics?.dataPoints.dataset || 0} dataset records +{" "}
                  {analytics?.dataPoints.realtime || 0} real-time sensor
                  readings = {analytics?.dataPoints.total || 0} total records
                </p>
              </div>
            </div>

            {analytics && (
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                  Data Analytics Dashboard
                </h2>

                {/* Descriptive Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Temperature Statistics */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>🌡️</span> Temperature Statistics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-800">Mean:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.temperature.mean.toFixed(2)}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Median:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.temperature.median.toFixed(2)}
                          °C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Min:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.temperature.min.toFixed(2)}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Max:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.temperature.max.toFixed(2)}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Std Dev:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.temperature.stdDev.toFixed(2)}
                          °C
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Humidity Statistics */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>💧</span> Humidity Statistics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-800">Mean:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.humidity.mean.toFixed(2)} %RH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Median:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.humidity.median.toFixed(2)} %RH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Min:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.humidity.min.toFixed(2)} %RH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Max:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.humidity.max.toFixed(2)} %RH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Std Dev:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.humidity.stdDev.toFixed(2)} %RH
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fan Speed Statistics */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>🌀</span> Fan Speed Statistics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-800">Mean:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.fanSpeed.mean.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Median:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.fanSpeed.median.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Min:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.fanSpeed.min.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Max:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.fanSpeed.max.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-800">Std Dev:</span>
                        <span className="font-semibold text-gray-900">
                          {analytics.descriptive.fanSpeed.stdDev.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Graphs Section */}
                {analytics && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                      Dataset Analytics Visualizations
                    </h2>

                    {/* Descriptive Analytics - Statistics Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Temperature Statistics Comparison */}
                      <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                          Descriptive Analytics: Temperature Statistics
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={[
                              {
                                name: "Mean",
                                value: analytics.descriptive.temperature.mean,
                              },
                              {
                                name: "Median",
                                value: analytics.descriptive.temperature.median,
                              },
                              {
                                name: "Min",
                                value: analytics.descriptive.temperature.min,
                              },
                              {
                                name: "Max",
                                value: analytics.descriptive.temperature.max,
                              },
                              {
                                name: "Std Dev",
                                value: analytics.descriptive.temperature.stdDev,
                              },
                            ]}
                            margin={{
                              left: 60,
                              right: 10,
                              top: 10,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e5e7eb"
                              opacity={0.3}
                            />
                            <XAxis
                              dataKey="name"
                              stroke="#6b7280"
                              style={{ fontSize: "12px" }}
                            />
                            <YAxis
                              stroke="#6b7280"
                              style={{ fontSize: "12px" }}
                              width={60}
                              label={{
                                value: "Temperature (°C)",
                                angle: -90,
                                position: "left",
                                style: { textAnchor: "middle" },
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              }}
                              labelStyle={{ color: "#000000" }}
                              formatter={(value: number) =>
                                `${value.toFixed(2)}°C`
                              }
                            />
                            <Bar
                              dataKey="value"
                              fill="#f97316"
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Humidity Statistics Comparison */}
                      <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                          Descriptive Analytics: Humidity Statistics
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={[
                              {
                                name: "Mean",
                                value: analytics.descriptive.humidity.mean,
                              },
                              {
                                name: "Median",
                                value: analytics.descriptive.humidity.median,
                              },
                              {
                                name: "Min",
                                value: analytics.descriptive.humidity.min,
                              },
                              {
                                name: "Max",
                                value: analytics.descriptive.humidity.max,
                              },
                              {
                                name: "Std Dev",
                                value: analytics.descriptive.humidity.stdDev,
                              },
                            ]}
                            margin={{
                              left: 80,
                              right: 10,
                              top: 10,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e5e7eb"
                              opacity={0.3}
                            />
                            <XAxis
                              dataKey="name"
                              stroke="#6b7280"
                              style={{ fontSize: "12px" }}
                            />
                            <YAxis
                              stroke="#6b7280"
                              style={{ fontSize: "12px" }}
                              width={80}
                              label={{
                                value: "Relative Humidity (%RH)",
                                angle: -90,
                                position: "left",
                                style: { textAnchor: "middle" },
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              }}
                              labelStyle={{ color: "#000000" }}
                              formatter={(value: number) =>
                                `${value.toFixed(2)} %RH`
                              }
                            />
                            <Bar
                              dataKey="value"
                              fill="#3b82f6"
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Diagnostic Analytics - Correlations Heatmap */}
                    <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50 mb-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">
                        Correlation Matrix Heatmap
                      </h3>
                      <div className="flex flex-col items-center">
                        {/* Helper function to get correlation color (red = positive, blue = negative) */}
                        {(() => {
                          const getCorrelationColor = (value: number) => {
                            // Color mapping based on correlation strength
                            // Positive correlations: red shades, Negative correlations: blue shades

                            if (value >= 0.8) return "#8B0000"; // Dark red for very strong positive
                            if (value >= 0.6) return "#C41E3A"; // Red for strong positive
                            if (value >= 0.4) return "#E97451"; // Light red-orange for moderate positive
                            if (value >= 0.2) return "#F4A582"; // Light orange for weak positive
                            if (value >= -0.2) return "#FDDBC7"; // Very light orange/beige for near zero
                            if (value >= -0.4) return "#D1E5F0"; // Light blue for weak negative
                            if (value >= -0.6) return "#92C5DE"; // Light blue for moderate negative
                            if (value >= -0.8) return "#4393C3"; // Blue for strong negative
                            return "#2166AC"; // Dark blue for very strong negative
                          };

                          const correlations =
                            analytics.diagnostic.correlations;
                          const matrix = [
                            [
                              1.0,
                              correlations.tempHumidity,
                              correlations.tempFanSpeed,
                            ],
                            [
                              correlations.tempHumidity,
                              1.0,
                              correlations.humidityFanSpeed,
                            ],
                            [
                              correlations.tempFanSpeed,
                              correlations.humidityFanSpeed,
                              1.0,
                            ],
                          ];
                          const labels = [
                            "Temperature",
                            "Humidity",
                            "Fan Speed",
                          ];

                          return (
                            <>
                              {/* Correlation Matrix Grid */}
                              <div className="inline-block">
                                <div className="grid grid-cols-4 gap-1">
                                  {/* Empty top-left cell */}
                                  <div className="w-28 h-24"></div>

                                  {/* Column headers */}
                                  {labels.map((label, idx) => (
                                    <div
                                      key={`col-${idx}`}
                                      className="w-28 h-24 flex items-center justify-center"
                                    >
                                      <span className="text-sm font-semibold text-gray-800 text-center">
                                        {label}
                                      </span>
                                    </div>
                                  ))}

                                  {/* Matrix rows */}
                                  {matrix.map((row, rowIdx) => (
                                    <React.Fragment key={`row-${rowIdx}`}>
                                      {/* Row header */}
                                      <div className="w-28 h-24 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-gray-800 text-center">
                                          {labels[rowIdx]}
                                        </span>
                                      </div>

                                      {/* Row cells */}
                                      {row.map((value, colIdx) => (
                                        <div
                                          key={`cell-${rowIdx}-${colIdx}`}
                                          className="w-28 h-24 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-sm border border-gray-200"
                                          style={{
                                            backgroundColor:
                                              getCorrelationColor(value),
                                          }}
                                          title={`${labels[rowIdx]} ↔ ${
                                            labels[colIdx]
                                          }: ${value.toFixed(4)}`}
                                        >
                                          <span
                                            className={`text-lg font-bold ${
                                              Math.abs(value) > 0.3
                                                ? "text-white"
                                                : "text-gray-800"
                                            }`}
                                          >
                                            {value.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>

                              {/* Color Scale Legend */}
                              <div className="mt-6 w-full max-w-md">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-700">
                                    -1.0
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    0.0
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    1.0
                                  </span>
                                </div>
                                <div
                                  className="h-6 rounded-lg"
                                  style={{
                                    background:
                                      "linear-gradient(to right, #2166AC, #4393C3, #92C5DE, #D1E5F0, #FDDBC7, #F4A582, #E97451, #C41E3A, #8B0000)",
                                  }}
                                ></div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-600">
                                    Strong Negative
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Weak
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Strong Positive
                                  </span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Predictive Analytics - Moving Averages & Forecasts */}
                    <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50 mb-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">
                        Predictive Analytics: Moving Averages vs Forecasts
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={[
                            {
                              name: "Temperature",
                              movingAvg:
                                analytics.predictive.movingAverages.temperature,
                              forecast:
                                analytics.predictive.forecast.temperature,
                            },
                            {
                              name: "Humidity",
                              movingAvg:
                                analytics.predictive.movingAverages.humidity,
                              forecast: analytics.predictive.forecast.humidity,
                            },
                          ]}
                          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#000000" }}
                            formatter={(
                              value: number,
                              name: string,
                              props: { payload?: { name?: string } }
                            ) => {
                              // Access the payload to determine if it's Temperature or Humidity
                              const payload = props?.payload;
                              const metricName = payload?.name;

                              if (metricName === "Temperature") {
                                return `${value.toFixed(2)} °C`;
                              } else if (metricName === "Humidity") {
                                return `${value.toFixed(2)} %RH`;
                              }

                              // Fallback: determine by value range
                              if (value > 20 && value <= 40) {
                                // Temperature in typical range
                                return `${value.toFixed(2)} °C`;
                              }
                              return `${value.toFixed(2)} %RH`;
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="movingAvg"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            name="Moving Average (5-point)"
                            dot={{ fill: "#3b82f6", r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="forecast"
                            stroke="#f97316"
                            strokeWidth={3}
                            name="Forecast (Next Value)"
                            strokeDasharray="5 5"
                            dot={{ fill: "#f97316", r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Trend Analysis */}
                    <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">
                        Diagnostic Analytics: Trend Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={[
                            {
                              name: "Temperature Trend",
                              value: analytics.diagnostic.trends.temperature,
                            },
                            {
                              name: "Humidity Trend",
                              value: analytics.diagnostic.trends.humidity,
                            },
                          ]}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                            label={{
                              value: "Trend Slope",
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#000000" }}
                            formatter={(value: number) => value.toFixed(4)}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {[
                              analytics.diagnostic.trends.temperature,
                              analytics.diagnostic.trends.humidity,
                            ].map((value, index) => (
                              <Cell
                                key={`cell-trend-${index}`}
                                fill={value > 0 ? "#ef4444" : "#3b82f6"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Diagnostic Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Correlations */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>📊</span> Variable Correlations
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Temp ↔ Humidity:</span>
                        <span
                          className={`font-semibold ${
                            Math.abs(
                              analytics.diagnostic.correlations.tempHumidity
                            ) > 0.5
                              ? "text-blue-600"
                              : "text-gray-800"
                          }`}
                        >
                          {analytics.diagnostic.correlations.tempHumidity.toFixed(
                            3
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Temp ↔ Fan Speed:</span>
                        <span
                          className={`font-semibold ${
                            Math.abs(
                              analytics.diagnostic.correlations.tempFanSpeed
                            ) > 0.5
                              ? "text-orange-600"
                              : "text-gray-800"
                          }`}
                        >
                          {analytics.diagnostic.correlations.tempFanSpeed.toFixed(
                            3
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Humidity ↔ Fan Speed:
                        </span>
                        <span
                          className={`font-semibold ${
                            Math.abs(
                              analytics.diagnostic.correlations.humidityFanSpeed
                            ) > 0.5
                              ? "text-green-600"
                              : "text-gray-800"
                          }`}
                        >
                          {analytics.diagnostic.correlations.humidityFanSpeed.toFixed(
                            3
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Values range from -1 to 1. Closer to ±1 indicates
                        stronger correlation.
                      </div>
                    </div>
                  </div>

                  {/* Trends & Heat Index */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>📈</span> Trends & Heat Index
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Temperature Trend:
                        </span>
                        <span
                          className={`font-semibold ${
                            analytics.diagnostic.trends.temperature > 0
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                        >
                          {analytics.diagnostic.trends.temperature > 0
                            ? "↑"
                            : "↓"}{" "}
                          {Math.abs(
                            analytics.diagnostic.trends.temperature
                          ).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Humidity Trend:</span>
                        <span
                          className={`font-semibold ${
                            analytics.diagnostic.trends.humidity > 0
                              ? "text-blue-600"
                              : "text-orange-600"
                          }`}
                        >
                          {analytics.diagnostic.trends.humidity > 0 ? "↑" : "↓"}{" "}
                          {Math.abs(
                            analytics.diagnostic.trends.humidity
                          ).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                        <span className="text-gray-600">Heat Index:</span>
                        <span
                          className={`font-semibold text-lg ${
                            analytics.diagnostic.heatIndex > 30
                              ? "text-red-600"
                              : analytics.diagnostic.heatIndex > 27
                              ? "text-orange-600"
                              : "text-blue-600"
                          }`}
                        >
                          {analytics.diagnostic.heatIndex.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Predictive Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Forecasts */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>🔮</span> Predictive Forecasts
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">
                            Next Temperature:
                          </span>
                          <span className="font-bold text-orange-600">
                            {analytics.predictive.forecast.temperature.toFixed(
                              1
                            )}
                            °C
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                (analytics.predictive.forecast.temperature /
                                  50) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Next Humidity:</span>
                          <span className="font-bold text-blue-600">
                            {analytics.predictive.forecast.humidity.toFixed(1)}{" "}
                            %RH
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${analytics.predictive.forecast.humidity}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Optimal Fan Speed:
                          </span>
                          <span className="font-bold text-green-600 text-lg">
                            {analytics.predictive.optimalFanSpeed === 0
                              ? "OFF"
                              : analytics.predictive.optimalFanSpeed === 33
                              ? "LOW"
                              : analytics.predictive.optimalFanSpeed === 66
                              ? "MID"
                              : "MAX"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Moving Averages */}
                  <div className="backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>📉</span> Moving Averages (5-point)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Temperature MA:</span>
                          <span className="font-bold text-orange-600">
                            {analytics.predictive.movingAverages.temperature.toFixed(
                              1
                            )}
                            °C
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                (analytics.predictive.movingAverages
                                  .temperature /
                                  50) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Humidity MA:</span>
                          <span className="font-bold text-blue-600">
                            {analytics.predictive.movingAverages.humidity.toFixed(
                              1
                            )}{" "}
                            %RH
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${analytics.predictive.movingAverages.humidity}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Data Points: {analytics.dataPoints.total} total
                          <br />({analytics.dataPoints.realtime} realtime +{" "}
                          {analytics.dataPoints.dataset} dataset)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {analyticsLoading && !analytics && (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading analytics...</div>
              </div>
            )}

            {!analytics && !analyticsLoading && (
              <div className="text-center py-12 backdrop-blur-md bg-white/70 rounded-[32px] shadow-lg p-6 border border-white/50">
                <p className="text-gray-600 text-lg">
                  No analytics data available. Please ensure the dataset has
                  been loaded into MongoDB.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
