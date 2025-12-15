# IoT-Enabled Temperature and Humidity-Controlled Fan System

## Overview
This project implements an Internet of Things (IoT)-based smart fan control system that automatically adjusts fan speed based on ambient temperature and humidity. An ESP32 microcontroller is used for sensing, control, and wireless communication, while a web-based dashboard enables real-time monitoring.

The system dynamically controls fan speed using PWM and threshold-based logic to improve comfort and energy efficiency.

---

## Features
- Real-time temperature and humidity monitoring
- Automatic fan speed control using PWM
- Combined temperature–humidity decision logic
- Web dashboard for live visualization
- REST API-based data transmission
- Scalable client–server architecture
- Energy-efficient operation

---

## System Architecture
The system follows a sense–decide–act–report workflow:

1. Sense: DHT11 measures temperature and humidity  
2. Decide: ESP32 applies threshold-based control logic  
3. Act: Fan speed is adjusted using PWM via the L298N motor driver  
4. Report: Sensor readings and fan status are transmitted to the dashboard over Wi-Fi  

---

## Hardware Components
- ESP32 Microcontroller  
- DHT11 Temperature & Humidity Sensor  
- L298N Motor Driver Module  
- 5V DC Fan  
- External 5V Power Adapter  
