import { MongoClient } from "mongodb";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || process.env.DB_Name;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in .env.local file");
}

if (!dbName) {
  throw new Error("DB_NAME is not defined in .env.local file");
}

interface CSVRow {
  "S.No.": string;
  datetime: string;
  temperature: string;
  humidity: string;
  mode: string;
  speed: string;
  opTime: string;
  eSpent: string;
  eSaved: string;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row as CSVRow;
  });
}

function parseDateTime(dateTimeStr: string): Date {
  // Handle empty or undefined values
  if (!dateTimeStr || dateTimeStr.trim() === "") {
    return new Date(); // Return current date as fallback
  }

  try {
    // Format: "01/04/2021 0:01"
    const parts = dateTimeStr.trim().split(" ");
    if (parts.length < 2) {
      return new Date(); // Return current date if format is invalid
    }

    const datePart = parts[0];
    const timePart = parts[1];

    if (!datePart || !timePart) {
      return new Date();
    }

    const dateParts = datePart.split("/");
    const timeParts = timePart.split(":");

    if (dateParts.length < 3 || timeParts.length < 2) {
      return new Date();
    }

    const [day, month, year] = dateParts;
    const [hour, minute] = timeParts;

    return new Date(
      parseInt(year) || new Date().getFullYear(),
      (parseInt(month) || 1) - 1,
      parseInt(day) || 1,
      parseInt(hour) || 0,
      parseInt(minute) || 0
    );
  } catch (error) {
    console.warn(`Error parsing date: ${dateTimeStr}, using current date`);
    return new Date();
  }
}

// Aggregate data by hourly intervals to reduce record count
function aggregateByHour(
  documents: any[],
  roomType: string,
  fanNumber: string
): any[] {
  // Group by hour (YYYY-MM-DD-HH)
  const hourlyGroups: { [key: string]: any[] } = {};

  documents.forEach((doc) => {
    const date = new Date(doc.datetime);
    const hourKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${String(
      date.getHours()
    ).padStart(2, "0")}`;

    if (!hourlyGroups[hourKey]) {
      hourlyGroups[hourKey] = [];
    }
    hourlyGroups[hourKey].push(doc);
  });

  // Aggregate each hour group
  const aggregated: any[] = [];

  Object.keys(hourlyGroups).forEach((hourKey) => {
    const group = hourlyGroups[hourKey];
    if (group.length === 0) return;

    // Calculate averages
    const avgTemp =
      group.reduce((sum, d) => sum + d.temperature, 0) / group.length;
    const avgHumidity =
      group.reduce((sum, d) => sum + d.humidity, 0) / group.length;

    // Get most common speed (mode)
    const speedCounts: { [key: number]: number } = {};
    group.forEach((d) => {
      speedCounts[d.speed] = (speedCounts[d.speed] || 0) + 1;
    });
    const mostCommonSpeed = Object.keys(speedCounts).reduce((a, b) =>
      speedCounts[parseInt(a)] > speedCounts[parseInt(b)] ? a : b
    );

    // Get most common mode
    const modeCounts: { [key: number]: number } = {};
    group.forEach((d) => {
      modeCounts[d.mode] = (modeCounts[d.mode] || 0) + 1;
    });
    const mostCommonMode = Object.keys(modeCounts).reduce((a, b) =>
      modeCounts[parseInt(a)] > modeCounts[parseInt(b)] ? a : b
    );

    // Sum up totals
    const totalOpTime = group.reduce((sum, d) => sum + d.opTime, 0);
    const totalESpent = group.reduce((sum, d) => sum + d.eSpent, 0);
    const totalESaved = group.reduce((sum, d) => sum + d.eSaved, 0);

    // Use the datetime from the middle record of the hour
    const middleIndex = Math.floor(group.length / 2);
    const representativeDate = group[middleIndex].datetime;

    aggregated.push({
      roomType,
      fanNumber,
      datetime: representativeDate,
      temperature: parseFloat(avgTemp.toFixed(2)),
      humidity: parseFloat(avgHumidity.toFixed(2)),
      mode: parseInt(mostCommonMode),
      speed: parseInt(mostCommonSpeed),
      opTime: totalOpTime,
      eSpent: parseFloat(totalESpent.toFixed(2)),
      eSaved: parseFloat(totalESaved.toFixed(2)),
      source: "dataset",
      createdAt: new Date(),
    });
  });

  return aggregated.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

async function loadDataset() {
  if (!uri || !dbName) {
    throw new Error("MONGODB_URI and DB_NAME must be defined in .env.local");
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection("dataset_readings");

    // Clear existing dataset data (optional - comment out if you want to keep existing)
    // await collection.deleteMany({});

    const datasetPath = path.join(process.cwd(), "..", "Dataset");
    const files = fs
      .readdirSync(datasetPath)
      .filter((file) => file.endsWith(".csv"));

    console.log(`Found ${files.length} CSV files`);

    let totalInserted = 0;

    for (const file of files) {
      const filePath = path.join(datasetPath, file);
      console.log(`Processing ${file}...`);

      const rows = parseCSV(filePath);
      const roomType = file.split("_")[0]; // Bedroom, Drawingroom, Lounge
      const fanNumber = file.split("_")[2]?.replace(".csv", "") || "1"; // 1, 2, 3

      // Filter out rows with empty or invalid data
      const validDocuments = rows
        .filter((row) => row.datetime && row.datetime.trim() !== "")
        .map((row) => ({
          roomType,
          fanNumber,
          datetime: parseDateTime(row.datetime),
          temperature: parseFloat(row.temperature) || 0,
          humidity: parseFloat(row.humidity) || 0,
          mode: parseInt(row.mode) || 0,
          speed: parseInt(row.speed) || 0,
          opTime: parseInt(row.opTime) || 0,
          eSpent: parseFloat(row.eSpent) || 0,
          eSaved: parseFloat(row.eSaved) || 0,
          source: "dataset",
          createdAt: new Date(),
        }));

      console.log(
        `  Parsed ${validDocuments.length} valid records from ${file}`
      );

      // Aggregate records by hour to reduce data volume
      const aggregatedDocuments = aggregateByHour(
        validDocuments,
        roomType,
        fanNumber
      );

      console.log(
        `  Aggregated to ${
          aggregatedDocuments.length
        } hourly records (reduced by ${Math.round(
          (1 - aggregatedDocuments.length / validDocuments.length) * 100
        )}%)`
      );

      // Insert in batches to avoid memory issues
      const batchSize = 1000;
      let fileInserted = 0;

      for (let i = 0; i < aggregatedDocuments.length; i += batchSize) {
        const batch = aggregatedDocuments.slice(i, i + batchSize);
        const result = await collection.insertMany(batch);
        fileInserted += result.insertedCount;
      }

      totalInserted += fileInserted;
      console.log(`  Inserted ${fileInserted} aggregated records from ${file}`);
    }

    console.log(`\nTotal records inserted: ${totalInserted}`);
    console.log("Dataset loading completed!");
  } catch (error) {
    console.error("Error loading dataset:", error);
  } finally {
    await client.close();
  }
}

loadDataset();
