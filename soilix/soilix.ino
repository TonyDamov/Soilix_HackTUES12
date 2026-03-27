#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <Adafruit_BMP280.h>
#include <SoftwareSerial.h>
#include "config.h"

// --- Global Objects ---
OneWire oneWire(TEMP_PIN);
DallasTemperature soilTempSensor(&oneWire);
Adafruit_SHT4x sht4;
Adafruit_BMP280 bmp;
SoftwareSerial sim800(SIM800_RX_PIN, SIM800_TX_PIN);

// --- Global Variables ---
bool sht4Found  = false;
bool bmpFound = false;
unsigned long lastTransmission = 0;
unsigned long currentInterval = 840000UL; 

void setup() {
  Serial.begin(9600);
  sim800.begin(9600);

  pinMode(SIM800_RST_PIN, OUTPUT);
  
  digitalWrite(SIM800_RST_PIN, LOW); 
  delay(100);
  digitalWrite(SIM800_RST_PIN, HIGH);
  
  delay(SIM_BOOT_DELAY_MS);

  initSensors();
  initNetwork();
  postDataToServer();
}

void loop() {
  #ifdef DEBUG
    while (sim800.available()) { Serial.write(sim800.read()); }
    while (Serial.available()) { sim800.write(Serial.read()); }
  #endif

  if (millis() - lastTransmission >= currentInterval) {
    lastTransmission = millis();
    postDataToServer();
  }
}