# Soilix

**Soilix** is a complete IoT smart garden monitoring system. It is designed specifically to help users monitor their plants in remote areas (like a village or distant field) where Wi-Fi and reliable power sources are unavailable. By utilizing cellular networks and solar power, the system allows users to check on their gardens from anywhere.

## System Architecture

The project is divided into three main software components:

### 1. Firmware (Hardware & IoT Logic)
The firmware runs on a low-power microcontroller and acts as the brain of the physical monitoring station.
*   **Data Collection:** It interfaces with multiple environmental sensors to read physical metrics, specifically soil moisture, soil temperature, air temperature, air humidity, and air pressure. 
*   **Cellular Transmission:** It bundles the collected sensor data into a single payload and transmits it to the server over a cellular network using a GSM module, bypassing the need for local Wi-Fi.

### 2. Backend (Data Processing & Storage)
The backend acts as the bridge between the physical garden sensors and the user's mobile device. 
*   **Microservices Architecture:** It is built using a containerized microservices architecture to ensure scalability and easy deployment.
*   **Data Handling:** The backend services listen for incoming cellular transmissions from the IoT devices, authenticate the data, and process the custom payloads.
*   **Cloud Storage:** All incoming live data is permanently stored in a cloud-hosted relational database, ensuring that historical records are safely kept and easily accessible for future querying.

### 3. Frontend (Mobile Application)
The frontend is a cross-platform mobile application that provides the user interface for the entire system.
*   **Visualization:** It fetches data from the backend API to display both real-time live sensor readings and historical data trends.
*   **User Alerts:** The application evaluates the data to provide system alerts, such as warning the user if soil moisture levels drop too low or if there are temperature warnings.
*   **Remote Management:** It ultimately translates the raw database numbers into an intuitive dashboard, allowing users to make informed decisions about when to visit or water their remote gardens without needing physical proximity.