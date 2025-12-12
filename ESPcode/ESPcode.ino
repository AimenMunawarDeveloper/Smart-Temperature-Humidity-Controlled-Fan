#include <DHT.h>
#include <WiFi.h>

// WiFi credentials - Mobile hotspot from Galaxy S22 Ultra
const char* ssid = "Galaxy S22 Ultra 9396";
const char* password = "umca9425";

// Dashboard server configuration
const char* server = "172.25.211.20";  // Your laptop's IP address
const int port = 3000;

// connecting the DH11 sensor to pin 18
#define DHTPIN 18         
#define DHTTYPE DHT11     

#define MOTOR_PIN_ENA 14  // enable pin on L298n motor driver
#define MOTOR_PIN_IN1 26  // input pin 1 of L298n motor driver
#define MOTOR_PIN_IN2 27  // input pin 2 of L298n motor driver

// temperature thresholds
#define TEMPERATURE_THRESHOLD1 25
#define TEMPERATURE_THRESHOLD2 27

// humidity thresholds
#define HUMIDITY_THRESHOLD1 60
#define HUMIDITY_THRESHOLD2 80

DHT dht(DHTPIN, DHTTYPE);
WiFiClient client;

void setup() {
  Serial.begin(115200); // starting serial communication at a specific baud rate
  dht.begin();
  // setting pins of motor as output
  pinMode(MOTOR_PIN_ENA, OUTPUT); // PWM pin to control motor speed
  pinMode(MOTOR_PIN_IN1, OUTPUT); // input pin 1 to control motor direction
  pinMode(MOTOR_PIN_IN2, OUTPUT); // input pin 2 to control motor direction

  // Connect to WiFi (non-blocking with timeout)
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTimeout < 20) {
    delay(500);
    Serial.print(".");
    wifiTimeout++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected! IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed - continuing without WiFi");
  }
  delay(1000);
}
void loop() {
  int dutyCycle1 = 50; // duty cycle for low fan speed
  int dutyCycle2 = 100; // duty cycle for medium fan speed
  int dutyCycle3 = 200; // duty cycle for high fan speed
  // adding a delay for sufficient time between consective readings
  delay(2000); 

  float temperature = dht.readTemperature(); // reading sensor data
  float humidity = dht.readHumidity(); // reading humidity data
  if (isnan(temperature) || isnan(humidity)) { // if data not a number we display failure to read temperture and exit
    Serial.println("Failed to read temperature from DHT sensor!");
    return;
  }
  Serial.print("Temperature: "); // printing temperature to serial monitor
  Serial.print(temperature);
  Serial.println(" °C");
  Serial.print("Humidity: "); // printing humidity to serial monitor
  Serial.print(humidity);
  Serial.println(" %");

  // determine temperature-based speed level (0=low, 1=mid, 2=high)
  int tempSpeedLevel;
  if (temperature <= TEMPERATURE_THRESHOLD1) {
    tempSpeedLevel = 0; // low speed
  } 
  else if(temperature > TEMPERATURE_THRESHOLD1 && temperature < TEMPERATURE_THRESHOLD2) {
    tempSpeedLevel = 1; // medium speed
  }
  else {
    tempSpeedLevel = 2; // high speed
  }

  // determine humidity-based speed level (0=low, 1=mid, 2=high)
  int humSpeedLevel;
  if (humidity <= HUMIDITY_THRESHOLD1) {
    humSpeedLevel = 0; // low speed
  } 
  else if(humidity > HUMIDITY_THRESHOLD1 && humidity < HUMIDITY_THRESHOLD2) {
    humSpeedLevel = 1; // medium speed
  }
  else {
    humSpeedLevel = 2; // high speed
  }

  // average both values and round to get final speed
  int finalSpeedLevel = round((tempSpeedLevel + humSpeedLevel) / 2.0);

  // determine fan speed string for dashboard
  String fanSpeed = "OFF";
  if (finalSpeedLevel == 0) {
    fanSpeed = "LOW";
  } 
  else if(finalSpeedLevel == 1) {
    fanSpeed = "MID";
  }
  else {
    fanSpeed = "MAX";
  }

  // set motor speed based on final speed level
  if (finalSpeedLevel == 0) {
    analogWrite(MOTOR_PIN_ENA, dutyCycle1);
    // setting motor direction to clockwise
    digitalWrite(MOTOR_PIN_IN1, HIGH);
    digitalWrite(MOTOR_PIN_IN2, LOW);
    Serial.println("Motor Speed: LOW");
  } 
  else if(finalSpeedLevel == 1) {
    // setting motor direction to clockwise
    digitalWrite(MOTOR_PIN_IN1, HIGH);
    digitalWrite(MOTOR_PIN_IN2, LOW);
    analogWrite(MOTOR_PIN_ENA, dutyCycle2);
    Serial.println("Motor Speed: MID");
  }
  else {
    digitalWrite(MOTOR_PIN_IN1, HIGH);
    digitalWrite(MOTOR_PIN_IN2, LOW);
    analogWrite(MOTOR_PIN_ENA, dutyCycle3);
    Serial.println("Motor Speed: MAX");
  }

  // Send data to dashboard via WiFi (using official ESP32 HTTP method)
  if (WiFi.status() == WL_CONNECTED) {
    int conn = client.connect(server, port);
    if (conn == 1) {
      // Create JSON body
      String jsonBody = "{\"temperature\":" + String(temperature) + ",\"humidity\":" + String(humidity) + ",\"fanSpeed\":\"" + fanSpeed + "\"}";
      int bodyLength = jsonBody.length();
      
      // Construct HTTP POST request (following official ESP32 documentation)
      client.println("POST /api/sensor-data HTTP/1.1");
      client.print("Host: "); 
      client.println(server);
      client.println("Content-Type: application/json");
      client.print("Content-Length: ");
      client.println(bodyLength);
      client.println("Connection: Close");
      client.println();
      client.println(jsonBody);
      client.println();
      
      // Wait briefly for response (non-blocking)
      unsigned long timeout = millis();
      while (client.available() == 0 && millis() - timeout < 2000) {
        delay(10);
      }
      
      // Read and discard response (optional - for debugging)
      if (client.available()) {
        Serial.println("Server response received");
        while (client.available()) {
          char c = client.read();
          // Uncomment next line to see full response
          // Serial.write(c);
        }
      }
      
      client.stop();
    } else {
      Serial.println("Failed to connect to server");
      client.stop();
    }
  }
}