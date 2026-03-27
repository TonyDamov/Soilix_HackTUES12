import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, getBearerAuthHeaders } from "../config/api";
import { useAuth } from "./AuthContext";

export type SensorReading = {
  airTemp: number;
  airHumidity: number;
  airPressure: number;
  soilHumidity: number;
  soilTemp: number;
};

export type Device = {
  id: string;
  name: string;
  readings: SensorReading;
  hasLiveData: boolean;
  recordedAt: string | null;
};

export type HistoricalData = {
  timestamp: string;
  value: number;
};

type Metric = keyof SensorReading;
type TimeRange = "1h" | "1d" | "1w" | "1m";

type DeviceContextType = {
  devices: Device[];
  loading: boolean;
  error: string;
  refreshDevices: () => Promise<void>;
  connectDevice: (deviceId: string) => Promise<string>;
  removeDevice: (id: string) => Promise<string>;
  getDevice: (id: string) => Device | undefined;
  getHistoricalData: (deviceId: string, metric: Metric, timeRange: TimeRange) => HistoricalData[];
};

type BackendDevice = {
  device_id: string | number;
  device_name?: string | null;
  air_temp_c?: number | null;
  air_humidity_pct?: number | null;
  air_pressure_hpa?: number | null;
  soil_humidity_pct?: number | null;
  soil_temp_c?: number | null;
  recorded_at?: string | null;
};

type DevicesResponse = {
  devices: BackendDevice[];
};

type ConnectDeviceResponse = {
  message: string;
  name?: string;
};

type DisconnectDeviceResponse = {
  message: string;
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

function generateMockReading(): SensorReading {
  return {
    airTemp: Math.round((15 + Math.random() * 15) * 10) / 10,
    airHumidity: Math.round((40 + Math.random() * 40) * 10) / 10,
    airPressure: Math.round((990 + Math.random() * 30) * 10) / 10,
    soilHumidity: Math.round((30 + Math.random() * 50) * 10) / 10,
    soilTemp: Math.round((10 + Math.random() * 15) * 10) / 10,
  };
}

function generateHistoricalData(baseValue: number, points: number, stepMinutes: number) {
  const now = Date.now();

  return Array.from({ length: points }, (_, index) => {
    const time = new Date(now - (points - index - 1) * stepMinutes * 60_000);
    const jitter = (Math.random() - 0.5) * Math.max(baseValue * 0.12, 4);

    return {
      timestamp: time.toISOString(),
      value: Math.round((baseValue + jitter) * 10) / 10,
    };
  });
}

export function DeviceProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshDevices = async () => {
    if (!user?.accessToken) {
      setDevices([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchDevices(user.accessToken);

      setDevices(
        response.devices.map((device) => ({
          id: String(device.device_id),
          name: device.device_name?.trim() || `Soilix Device ${device.device_id}`,
          readings: {
            airTemp: device.air_temp_c ?? 0,
            airHumidity: device.air_humidity_pct ?? 0,
            airPressure: device.air_pressure_hpa ?? 0,
            soilHumidity: device.soil_humidity_pct ?? 0,
            soilTemp: device.soil_temp_c ?? 0,
          },
          hasLiveData:
            device.air_temp_c !== null &&
            device.air_humidity_pct !== null &&
            device.air_pressure_hpa !== null &&
            device.soil_humidity_pct !== null &&
            device.soil_temp_c !== null,
          recordedAt: device.recorded_at ?? null,
        })),
      );
    } catch (err) {
      setDevices([]);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshDevices();
  }, [user?.accessToken]);

  const connectDevice = async (deviceId: string) => {
    const trimmed = deviceId.trim();
    if (!trimmed) {
      throw new Error("Device ID is required");
    }

    if (!user?.accessToken) {
      throw new Error("You need to be logged in to connect a device");
    }

    const response = await apiRequest<ConnectDeviceResponse>("/api/devices/connect", {
      method: "POST",
      body: { device_id: trimmed },
      headers: getBearerAuthHeaders(user.accessToken),
    });

    await refreshDevices();

    return response.message;
  };

  const removeDevice = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error("Device ID is required");
    }

    if (!user?.accessToken) {
      throw new Error("You need to be logged in to disconnect a device");
    }

    const response = await apiRequest<DisconnectDeviceResponse>("/api/devices/disconnect", {
      method: "POST",
      body: { device_id: trimmed },
      headers: getBearerAuthHeaders(user.accessToken),
    });

    await refreshDevices();

    return response.message;
  };

  const getDevice = (id: string) => devices.find((device) => device.id === id);

  const getHistoricalData = (deviceId: string, metric: Metric, timeRange: TimeRange) => {
    const device = getDevice(deviceId);
    if (!device) {
      return [];
    }

    const baseValue = device.readings[metric];
    const rangeMap: Record<TimeRange, { points: number; stepMinutes: number }> = {
      "1h": { points: 12, stepMinutes: 5 },
      "1d": { points: 24, stepMinutes: 60 },
      "1w": { points: 28, stepMinutes: 6 * 60 },
      "1m": { points: 30, stepMinutes: 24 * 60 },
    };

    return generateHistoricalData(baseValue, rangeMap[timeRange].points, rangeMap[timeRange].stepMinutes);
  };

  return (
    <DeviceContext.Provider
      value={{ devices, loading, error, refreshDevices, connectDevice, removeDevice, getDevice, getHistoricalData }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

async function fetchDevices(accessToken: string) {
  try {
    return await apiRequest<DevicesResponse>("/api/devices/live", {
      headers: getBearerAuthHeaders(accessToken),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Request failed with status 404") {
      const fallbackResponse = await apiRequest<{ devices: Array<{ id: string | number; device_name?: string | null }> }>(
        "/api/devices",
        {
          headers: getBearerAuthHeaders(accessToken),
        },
      );

      return {
        devices: fallbackResponse.devices.map((device) => ({
          device_id: device.id,
          device_name: device.device_name,
          air_temp_c: null,
          air_humidity_pct: null,
          air_pressure_hpa: null,
          soil_humidity_pct: null,
          soil_temp_c: null,
          recorded_at: null,
        })),
      };
    }

    throw error;
  }
}

export function useDevices() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error("useDevices must be used within DeviceProvider");
  }

  return context;
}
