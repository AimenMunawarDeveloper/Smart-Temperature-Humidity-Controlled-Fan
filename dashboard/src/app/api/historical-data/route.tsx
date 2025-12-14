import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000");
    const source = searchParams.get("source") || "all"; // 'realtime', 'dataset', 'all'

    const db = await getDatabase();

    let data: any[] = [];

    // Fetch REALTIME/SENSOR data ONLY when source is 'realtime' or 'all'
    if (source === "realtime" || source === "all") {
      const realtimeCollection = db.collection("sensor_readings");
      const realtimeData = await realtimeCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      const realtimeMapped = realtimeData.map((item: any) => ({
        time: new Date(item.createdAt || item.timestamp).toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        ),
        temperature: item.temperature,
        humidity: item.humidity,
        fanSpeed:
          item.fanSpeed === "OFF"
            ? 0
            : item.fanSpeed === "LOW"
            ? 33
            : item.fanSpeed === "MID"
            ? 66
            : 100,
        source: "realtime",
      }));

      // If source is ONLY realtime, return just realtime data
      if (source === "realtime") {
        return NextResponse.json({
          success: true,
          data: realtimeMapped,
          count: realtimeMapped.length,
        });
      }

      // Otherwise, add to data array for 'all' case
      data = [...data, ...realtimeMapped];
    }

    // Fetch DATASET data ONLY when source is 'dataset' or 'all'
    if (source === "dataset" || source === "all") {
      const datasetCollection = db.collection("dataset_readings");
      const datasetQuery = datasetCollection.find({}).sort({ datetime: -1 });

      // If source is dataset and no limit specified, fetch ALL records
      const datasetData =
        source === "dataset" && !searchParams.get("limit")
          ? await datasetQuery.toArray()
          : await datasetQuery.limit(limit).toArray();

      const datasetMapped = datasetData.map((item: any) => ({
        time: new Date(item.datetime).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        temperature: item.temperature,
        humidity: item.humidity,
        fanSpeed: item.speed || 0,
        source: "dataset",
      }));

      // If source is ONLY dataset, return just dataset data
      if (source === "dataset") {
        return NextResponse.json({
          success: true,
          data: datasetMapped,
          count: datasetMapped.length,
        });
      }

      // Otherwise, add to data array for 'all' case
      data = [...data, ...datasetMapped];
    }

    // For 'all' source: Sort by time and limit
    data.sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.time}`).getTime();
      const timeB = new Date(`2000-01-01 ${b.time}`).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      data: data.slice(0, limit),
      count: data.length,
    });
  } catch (error: any) {
    console.error("Error fetching historical data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
