void initNetwork() {
  sendATCommand("ATZ", "OK", 2000); 
  sendATCommand("ATE0", "OK", 2000);

  Serial.println(F("[SIM] Waiting for network registration..."));
  while (!sendATCommand("AT+CREG?", "+CREG: 0,1", 2000)) {
    DEBUG_PRINTLN(F("[SIM] Not registered yet, retrying in 2s..."));
    delay(2000);
  }
  Serial.println(F("[SIM] Network registered!"));

  configureGPRS();
}

void configureGPRS() {
  sim800.println("AT+COPS?");
  delay(2000);

  String copsResponse = "";
  while (sim800.available()) {
    copsResponse += (char)sim800.read();
  }
  
  DEBUG_PRINT(F("[SIM] AT+COPS? response: "));
  DEBUG_PRINTLN(copsResponse);

  const char* apn  = NULL;
  const char* user = NULL;
  const char* pass = NULL;

  for (uint8_t i = 0; i < BG_OPERATORS_COUNT; i++) {
    if (copsResponse.indexOf(BG_OPERATORS[i].mccmnc) != -1) {
      apn  = BG_OPERATORS[i].apn;
      user = BG_OPERATORS[i].user;
      pass = BG_OPERATORS[i].pass;
      DEBUG_PRINT(F("[SIM] Detected MCC/MNC: "));
      DEBUG_PRINTLN(BG_OPERATORS[i].mccmnc);
      break;
    }
  }

  if (apn == NULL) {
    Serial.println(F("[SIM] ERROR: Unknown operator, cannot configure GPRS. Halting."));
    while (true) {} 
  }

  Serial.print(F("[SIM] Using APN: "));
  Serial.println(apn);

  sendATCommand("AT+SAPBR=3,1,\"Contype\",\"GPRS\"",            "OK", 2000);
  sendATCommand("AT+SAPBR=3,1,\"APN\",\""  + String(apn)  + "\"", "OK", 2000);

  if (strlen(user) > 0) {
    sendATCommand("AT+SAPBR=3,1,\"USER\",\"" + String(user) + "\"", "OK", 2000);
  }
  if (strlen(pass) > 0) {
    sendATCommand("AT+SAPBR=3,1,\"PWD\",\""  + String(pass) + "\"", "OK", 2000);
  }

  sendATCommand("AT+SAPBR=1,1", "OK", 5000);
  sendATCommand("AT+GSMBUSY=1", "OK", 2000); 
}

String sendHTTPRequest(const String& url, const String& payload, bool getData) {
  String responseBody = "";

  DEBUG_PRINTLN(F("[HTTP] Starting request..."));
  sendATCommand("AT+HTTPINIT", "OK", 2000);
  sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 2000);
  sendATCommand("AT+HTTPPARA=\"URL\",\"" + url + "\"", "OK", 2000);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"text/plain\"", "OK", 2000);

  String dataCmd = "AT+HTTPDATA=" + String(payload.length()) + ",5000";

  if (sendATCommand(dataCmd, "DOWNLOAD", 3000)) {
    sim800.print(payload);
    delay(1000); 
    
    if (sendATCommand("AT+HTTPACTION=1", "+HTTPACTION:", 10000)) {
      if (getData) {
        DEBUG_PRINTLN(F("[HTTP] Reading server response..."));
        sim800.println(F("AT+HTTPREAD"));
        
        String rawResponse = "";
        unsigned long timeout = millis() + 5000;
        while (millis() < timeout) {
          while (sim800.available()) {
            rawResponse += (char)sim800.read();
          }
          if (rawResponse.indexOf("OK") != -1) break; 
        }

        int headerIndex = rawResponse.indexOf("+HTTPREAD:");
        if (headerIndex != -1) {
          int dataStartIndex = rawResponse.indexOf('\n', headerIndex) + 1;
          int dataEndIndex = rawResponse.lastIndexOf("OK");

          if (dataStartIndex > 0 && dataEndIndex > dataStartIndex) {
            responseBody = rawResponse.substring(dataStartIndex, dataEndIndex);
            responseBody.trim(); 
          }
        }
      } else {
        DEBUG_PRINTLN(F("[HTTP] Action successful. Skipping response read."));
      }
    } else {
      DEBUG_PRINTLN(F("[HTTP] ERROR: Action failed."));
    }
  } else {
    DEBUG_PRINTLN(F("[HTTP] ERROR: Module did not enter DOWNLOAD mode."));
  }

  sendATCommand("AT+HTTPTERM", "OK", 2000);
  return responseBody;
}

void postDataToServer() {
  DEBUG_PRINTLN(F("\n[DATA] Reading sensors..."));
  
  String payload = getSensorPayload();
  DEBUG_PRINT(F("[DATA] Payload: "));
  DEBUG_PRINTLN(payload);

  String returnedData = sendHTTPRequest(SERVER_URL, payload); 

  if (returnedData.length() > 0) {
    long newInterval = returnedData.toInt();
    if (newInterval > 0 && newInterval <= 43200000UL) {
      currentInterval = (unsigned long)newInterval;
      DEBUG_PRINT(F("[HTTP] Success! Interval updated to: "));
      DEBUG_PRINT(currentInterval);
      DEBUG_PRINTLN(F(" ms"));
    } else {
      DEBUG_PRINTLN(F("[HTTP] Returned value invalid or > 12 hours. Keeping current interval."));
    }
  } else {
    DEBUG_PRINTLN(F("[HTTP] Data sent successfully!"));
  }
}

bool sendATCommand(String command, const char* expectedResponse, unsigned long timeout) {
  sim800.println(command);

  unsigned long deadline = millis() + timeout;
  String response = "";

  while (millis() < deadline) {
    while (sim800.available()) {
      response += (char)sim800.read();
    }
    if (response.indexOf(expectedResponse) != -1) {
      DEBUG_PRINT(F("[AT] OK  << "));
      DEBUG_PRINTLN(command);
      return true;
    }
  }

  DEBUG_PRINT(F("[AT] FAIL << "));
  DEBUG_PRINTLN(command);
  DEBUG_PRINT(F("[AT] Got  : "));
  DEBUG_PRINTLN(response);
  return false;
}