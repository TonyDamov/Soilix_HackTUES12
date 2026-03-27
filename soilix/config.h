#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

#define DEBUG

#ifdef DEBUG
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_BEGIN(x) Serial.begin(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_BEGIN(x)
#endif

// --- Pins ---
#define SOIL_PIN       A2
#define TEMP_PIN       2
#define SIM800_RX_PIN  A0
#define SIM800_TX_PIN  13
#define SIM800_RST_PIN 11

// --- Server Settings ---
#define DEVICE_ID   "f9a2c209-c862-47db-b674-42eca22a6653"
#define SERVER_URL  "http://195.68.215.115/device/reading/" DEVICE_ID

// --- Timing ---
#define SIM_BOOT_DELAY_MS 3000UL   

// --- APN Configuration ---
struct OperatorAPN {
  const char* mccmnc;
  const char* apn;
  const char* user;
  const char* pass;
};

const OperatorAPN BG_OPERATORS[] = {
  { "28403", "internet.vivacom.bg", "VIVACOM", "VIVACOM" },
  { "28401", "internet.a1.bg",      "",        ""        }, 
  { "28404", "internet",            "Yettel",  ""        },  
};

const uint8_t BG_OPERATORS_COUNT = sizeof(BG_OPERATORS) / sizeof(BG_OPERATORS[0]);

// --- Sensor Calibration ---
#define SOIL_DRY_VALUE 450
#define SOIL_WET_VALUE 198

void initSensors();
int getSoilMoisturePercent();
float getSoilTemperature();
float getAirTemperature();
float getAirHumidity();
float getAirPressure();
String getSensorPayload();
void initNetwork();
void configureGPRS();
void postDataToServer();
String sendHTTPRequest(const String& url, const String& payload, bool getData = true);
bool sendATCommand(String command, const char* expectedResponse, unsigned long timeout);

#endif