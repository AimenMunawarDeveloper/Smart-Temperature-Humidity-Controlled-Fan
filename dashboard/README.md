The system controls a DC fan motor using an L298N motor driver, adjusting the speed (LOW, MID, or MAX) based on predefined comfort thresholds. Data is continuously logged and transmitted via HTTP POST to a centralized server for monitoring and analysis and it's a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.


## Configuration & Setup

### 1. WiFi & Server Credentials
Update the following variables in the Arduino sketch (`.ino` file`) to match your network and dashboard setup:

| Variable  | Value                     | Description                                              |
|-----------|---------------------------|----------------------------------------------------------|
| `ssid`    | `"Galaxy S22 Ultra 9396"` | Your WiFi network or mobile hotspot name               |
| `password`| `"umca9425"`              | The corresponding WiFi network password                |
| `server`  | `"172.25.211.20"`         | Local IP address of the machine hosting your dashboard |
| `port`    | `3000`                     | Network port the dashboard server listens on          |

---

### 2. Motor Pins
The **L298N Motor Driver** is connected to the ESP32 using the following GPIO pins:

| Pin Macro        | ESP32 GPIO | Function                                           | Type           |
|-----------------|------------|---------------------------------------------------|----------------|
| `MOTOR_PIN_ENA`  | 14         | Enables motor and controls speed (PWM)           | Output (PWM)  |
| `MOTOR_PIN_IN1`  | 26         | Controls motor direction (Set HIGH for clockwise)| Output (Digital) |
| `MOTOR_PIN_IN2`  | 27         | Controls motor direction (Set LOW for clockwise) | Output (Digital) |
| `DHTPIN`         | 18         | Data pin for the DHT11 Temperature/Humidity Sensor | Input        |

---

### 3. Fan Speed Thresholds
The fan speed is determined by comparing sensor readings to these thresholds. The final speed level is calculated by averaging the levels from **both Temperature and Humidity**.

| Sensor      | Speed Level | Threshold 1 (LOW/MID) | Threshold 2 (MID/MAX) |
|------------|-------------|----------------------|-----------------------|
| Temperature| LOW / MID / MAX | ≤ 25°C              | ≥ 27°C               |
| Humidity   | LOW / MID / MAX | ≤ 60%               | ≥ 80%                |

**Humidity-Based Speed Mapping:**
- Low speed: Humidity ≤ 60% → Speed 0  
- Medium speed: 60% < Humidity < 80% → Speed 1  
- High speed: Humidity ≥ 80% → Speed 2  

**Temperature-Based Speed Mapping:**
- Low speed: Temp ≤ 25°C → Speed LOW  
- Medium speed: 25°C < Temp < 27°C → Speed MID  
- High speed: Temp ≥ 27°C → Speed MAX  

---

### 4. Motor Duty Cycles (PWM Power)
The fan's physical speed is set by these fixed PWM duty cycle values (out of 255 maximum):

| Speed Level | Duty Cycle |
|------------|------------|
| LOW        | 50         |
| MID        | 100        |
| MAX        | 200        |




## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
