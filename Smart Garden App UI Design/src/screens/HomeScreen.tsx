import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton } from "../components/AppButton";
import { MetricPill } from "../components/MetricPill";
import { PromptModal } from "../components/PromptModal";
import { Screen } from "../components/Screen";
import { SectionCard } from "../components/SectionCard";
import { useDevices } from "../context/DeviceContext";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { devices, loading, error, connectDevice, refreshDevices } = useDevices();
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleAddDevice = () => {
    setModalVisible(true);
  };

  const handleCreateDevice = async (deviceId: string) => {
    const trimmed = deviceId.trim();
    if (!trimmed) {
      Alert.alert("Missing ID", "Please enter a valid device ID.");
      return;
    }

    setCreating(true);

    try {
      const message = await connectDevice(trimmed);
      setModalVisible(false);
      Alert.alert("Device updated", message);
    } catch (err) {
      Alert.alert("Could not connect device", (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Smart Garden</Text>
            <Text style={styles.title}>Your devices</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.headerBadge}>
            <MaterialCommunityIcons name="account-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <AppButton title="Connect Existing Device" onPress={handleAddDevice} loading={creating} />

        {loading ? <Text style={styles.helperText}>Loading your connected devices...</Text> : null}
        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}
        {!loading && !error && !devices.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No connected devices yet</Text>
            <Text style={styles.emptyCopy}>Connect a Soilix device to see it here.</Text>
            <AppButton title="Refresh Devices" onPress={() => void refreshDevices()} variant="secondary" />
          </View>
        ) : null}

        <View style={styles.list}>
          {devices.map((device) => (
            <Pressable
              key={device.id}
              onPress={() => navigation.navigate("DeviceDetails", { deviceId: device.id })}
              style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
            >
              <SectionCard>
                <View style={styles.deviceHeader}>
                  <View>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceSub}>
                      {device.hasLiveData ? "Live environmental readings" : "No live readings yet"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#7b9681" />
                </View>

                <MetricPill
                  icon="thermometer"
                  label="Air Temperature"
                  value={formatMetricValue(device.readings.airTemp, "C", device.hasLiveData)}
                  tint="#f28b37"
                />
                <MetricPill
                  icon="water-percent"
                  label="Air Humidity"
                  value={formatMetricValue(device.readings.airHumidity, "%", device.hasLiveData)}
                  tint="#4d96d8"
                />
                <MetricPill
                  icon="gauge"
                  label="Air Pressure"
                  value={formatMetricValue(device.readings.airPressure, " hPa", device.hasLiveData)}
                  tint="#9566d8"
                />
                <MetricPill
                  icon="sprout"
                  label="Soil Humidity"
                  value={formatMetricValue(device.readings.soilHumidity, "%", device.hasLiveData)}
                  tint="#4aaf5d"
                />
                <MetricPill
                  icon="thermometer-lines"
                  label="Soil Temperature"
                  value={formatMetricValue(device.readings.soilTemp, "C", device.hasLiveData)}
                  tint="#c88f31"
                />
              </SectionCard>
            </Pressable>
          ))}
        </View>
      </Screen>
      <PromptModal
        visible={modalVisible}
        title="Connect Existing Device"
        description="Enter a valid device ID. The device can be connected only if it currently has no owner."
        placeholder="Device UUID"
        confirmLabel="Connect"
        initialValue=""
        loading={creating}
        onCancel={() => setModalVisible(false)}
        onConfirm={handleCreateDevice}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  list: {
    gap: 14,
    marginTop: 16,
    paddingBottom: 20,
  },
  helperText: {
    marginTop: 14,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#fdeceb",
    color: colors.danger,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyState: {
    marginTop: 16,
    gap: 12,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyCopy: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  pressable: {
    borderRadius: 24,
  },
  pressed: {
    opacity: 0.95,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  deviceSub: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },
});

function formatMetricValue(value: number, unit: string, hasLiveData: boolean) {
  if (!hasLiveData) {
    return "N/A";
  }

  return `${value.toFixed(1)}${unit}`;
}
