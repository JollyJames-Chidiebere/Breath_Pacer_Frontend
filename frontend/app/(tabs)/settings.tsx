import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../Breath_Pacer/utils/api";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { BlurView } from "expo-blur";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../../Breath_Pacer/config/firebase";


const COLORS = {
  primary: "#4DB6AC",
  accent: "#64B5F6",
  danger: "#E53935",
  backgroundLight: ["#0f2027", "#203a43", "#2c5364"] as const,
  backgroundDark: ["#1c1c1c", "#121212", "#000000"] as const,
};

type CardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  children: React.ReactNode;
  darkMode?: boolean;
};

type TimerTuple = [string, number, React.Dispatch<React.SetStateAction<number>>];

export default function SettingsScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  // Core Settings
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [inhale, setInhale] = useState(4);
  const [inhaleHold, setInhaleHold] = useState(4);
  const [exhale, setExhale] = useState(4);
  const [exhaleHold, setExhaleHold] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(10);
  const [manualInputMode, setManualInputMode] = useState(false);
  const [breathingPattern, setBreathingPattern] = useState("Box Breathing");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const breathingPatterns = [
    { name: "Box Breathing", desc: "Focus & calm" },
    { name: "4-7-8 Breathing", desc: "Deep relaxation" },
    { name: "Alternate Nostril", desc: "Balance energy" },
    { name: "Resonance Breathing", desc: "Steady heart rate" },
  ];

  const reminderOptions: string[] = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];
  // Load from local storage
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("breathingSettings");
      if (saved) {
        const s = JSON.parse(saved);
        setDarkMode(s.darkMode ?? false);
        setNotifications(s.notifications ?? true);
        setReminderTime(s.reminderTime ?? "08:00");
        setInhale(s.inhale ?? 4);
        setInhaleHold(s.inhaleHold ?? 4);
        setExhale(s.exhale ?? 4);
        setExhaleHold(s.exhaleHold ?? 4);
        setSessionMinutes(s.sessionMinutes ?? 10);
        setBreathingPattern(s.breathingPattern ?? "Box Breathing");
        setSoundEnabled(s.soundEnabled ?? true);
        setVibrationEnabled(s.vibrationEnabled ?? true);
      }
    })();
  }, []);

  // Auto-save to AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem(
      "breathingSettings",
      JSON.stringify({
        darkMode,
        notifications,
        reminderTime,
        inhale,
        inhaleHold,
        exhale,
        exhaleHold,
        sessionMinutes,
        breathingPattern,
        soundEnabled,
        vibrationEnabled,
      })
    );
  }, [
    darkMode,
    notifications,
    reminderTime,
    inhale,
    inhaleHold,
    exhale,
    exhaleHold,
    sessionMinutes,
    breathingPattern,
    soundEnabled,
    vibrationEnabled,
  ]);

  // Fetch cloud settings (from Django)
  const fetchSettingsFromServer = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return Alert.alert("Not signed in", "Please log in first.");
      const token = await user.getIdToken();
      const res = await API.get("/api/sessions/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.length > 0) {
        const last = res.data[0];
        setInhale(last.inhale_seconds ?? 4);
        setExhale(last.exhale_seconds ?? 4);
        setInhaleHold(last.hold_seconds ?? 4);
        setExhaleHold(last.exhale_hold_seconds ?? 4);
        setSessionMinutes(Math.round(last.duration_seconds / 60) ?? 10);
        Alert.alert("✅ Synced", "Settings loaded from your cloud backup!");
      } else {
        Alert.alert("No data", "No cloud settings found yet.");
      }
    } catch (err) {
      console.warn("Sync error:", err);
      Alert.alert("Error", "Could not fetch settings from cloud.");
    }
  };

  // Save settings to backend
  const saveToCloud = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "Please log in first.");
        return;
      }
      const token = await user.getIdToken();
      await API.post(
        "/api/sessions/",
        {
          duration_seconds: sessionMinutes * 60,
          inhale_seconds: inhale,
          hold_seconds: inhaleHold,
          exhale_seconds: exhale,
          exhale_hold_seconds: exhaleHold,
          device: "mobile",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("✅ Saved", "Your settings have been saved to the cloud!");
    } catch (error) {
      console.error("Cloud save error:", error);
      Alert.alert("Error", "Failed to save to cloud.");
    }
  };


  if (!fontsLoaded) return null;

  const Card: React.FC<CardProps> = ({ title, icon, description, children, darkMode }) => (
    <BlurView intensity={50} tint={darkMode ? "dark" : "light"} style={styles.card}>
      <Text style={styles.cardTitle}>
        <Ionicons name={icon} size={18} /> {title}
      </Text>
      {description && <Text style={styles.cardDescription}>{description}</Text>}
      {children}
    </BlurView>
  );

  const timerSettings: TimerTuple[] = [
    ["Inhale", inhale, setInhale],
    ["Inhale Hold", inhaleHold, setInhaleHold],
    ["Exhale", exhale, setExhale],
    ["Exhale Hold", exhaleHold, setExhaleHold],
    ["Session Duration", sessionMinutes, setSessionMinutes],
  ];

  return (
    <LinearGradient colors={darkMode ? COLORS.backgroundDark : COLORS.backgroundLight} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your breathing experience</Text>
        </View>

        {/* Appearance */}
        <Card title="Appearance" icon="color-palette-outline" description="Choose how the app looks" darkMode={darkMode}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.primary }} />
          </View>
        </Card>

        {/* Notifications */}
        <Card title="Notifications" icon="notifications-outline" description="Get daily breathing reminders" darkMode={darkMode}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Reminders</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: COLORS.primary }} />
          </View>
          {notifications && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.settingLabel}>Reminder Time</Text>
              <Picker
                selectedValue={reminderTime}
                onValueChange={(val: string) => setReminderTime(val)}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                {reminderOptions.map((time) => (
                  <Picker.Item key={time} label={time} value={time} />
                ))}
              </Picker>
            </View>
          )}
        </Card>

        {/* Breathing Pattern */}
        <Card title="Breathing Pattern" icon="pulse-outline" description="Select your preferred style" darkMode={darkMode}>
          {breathingPatterns.map((pattern) => (
            <TouchableOpacity
              key={pattern.name}
              style={[
                styles.patternButton,
                breathingPattern === pattern.name && { backgroundColor: COLORS.primary },
              ]}
              onPress={() => setBreathingPattern(pattern.name)}
            >
              <Text
                style={[
                  styles.patternText,
                  breathingPattern === pattern.name && { color: "#fff", fontWeight: "bold" },
                ]}
              >
                {pattern.name} — {pattern.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Sound & Vibration */}
        <Card title="Feedback Options" icon="musical-notes-outline" description="Control sound and vibration feedback" darkMode={darkMode}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Breath Cue Sound</Text>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: COLORS.primary }} />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Vibration Feedback</Text>
            <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} trackColor={{ true: COLORS.primary }} />
          </View>
        </Card>

        {/* Timer Settings */}
        <Card title="Breathing Timers" icon="timer-outline" description="Adjust timing for each phase" darkMode={darkMode}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{manualInputMode ? "Manual Input" : "Slider Mode"}</Text>
            <Switch value={manualInputMode} onValueChange={() => setManualInputMode((p) => !p)} trackColor={{ true: COLORS.primary }} />
          </View>

          {manualInputMode ? (
            <>
              {timerSettings.map(([label, value, setter]) => (
                <View key={label} style={{ marginVertical: 6 }}>
                  <Text style={styles.settingLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={value.toString()}
                    onChangeText={(t: string) => setter(parseFloat(t) || 0)}
                  />
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.settingLabel}>Inhale: {inhale}s</Text>
              <Slider minimumValue={1} maximumValue={10} step={0.5} value={inhale} onValueChange={setInhale} />
              <Text style={styles.settingLabel}>Inhale Hold: {inhaleHold}s</Text>
              <Slider minimumValue={0} maximumValue={10} step={0.5} value={inhaleHold} onValueChange={setInhaleHold} />
              <Text style={styles.settingLabel}>Exhale: {exhale}s</Text>
              <Slider minimumValue={1} maximumValue={10} step={0.5} value={exhale} onValueChange={setExhale} />
              <Text style={styles.settingLabel}>Exhale Hold: {exhaleHold}s</Text>
              <Slider minimumValue={0} maximumValue={10} step={0.5} value={exhaleHold} onValueChange={setExhaleHold} />
              <Text style={styles.settingLabel}>Session Duration: {sessionMinutes}min</Text>
              <Slider minimumValue={1} maximumValue={60} step={1} value={sessionMinutes} onValueChange={setSessionMinutes} />
            </>
          )}
        </Card>

        {/* Support */}
        <Card title="Support & Info" icon="information-circle-outline" description="Learn more or get help" darkMode={darkMode}>
          <Text style={styles.supportText}>Bhakti Wellness is dedicated to helping you breathe your way to calm and balance.</Text>
          <TouchableOpacity onPress={() => Alert.alert("FAQ", "This would open the FAQ page")}>
            <Text style={styles.link}>Help & FAQ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("Contact", "This would open contact options")}>
            <Text style={styles.link}>Contact Support</Text>
          </TouchableOpacity>
        </Card>

        {/* Action Buttons */}
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.primary }]} onPress={() => router.push("/(tabs)/breathing1")}>
          <Text style={styles.actionText}>Start Breathing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.danger }]}
          onPress={() =>
            Alert.alert("Reset Settings", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reset",
                style: "destructive",
                onPress: () => {
                  setDarkMode(false);
                  setNotifications(true);
                  setReminderTime("08:00");
                  setInhale(4);
                  setInhaleHold(4);
                  setExhale(4);
                  setExhaleHold(4);
                  setSessionMinutes(10);
                  setBreathingPattern("Box Breathing");
                  setSoundEnabled(true);
                  setVibrationEnabled(true);
                },
              },
            ])
          }
        >
          <Text style={styles.actionText}>Reset to Default</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  headerContainer: { marginBottom: 20, alignItems: "center" },
  headerTitle: { fontSize: 28, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  headerSubtitle: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#cfd8dc" },
  card: { borderRadius: 15, padding: 15, marginBottom: 20, overflow: "hidden" },
  cardTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", marginBottom: 6, color: "#fff" },
  cardDescription: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#ddd", marginBottom: 8 },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8 },
  settingLabel: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#fff" },
  patternButton: { padding: 10, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 8 },
  patternText: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#fff", textAlign: "left" },
  input: { borderRadius: 8, padding: 8, backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: "Poppins_400Regular" },
  picker: { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, marginTop: 5 },
  supportText: { fontSize: 13, color: "#fff", fontFamily: "Poppins_400Regular", marginBottom: 8 },
  link: { fontSize: 14, color: "#64B5F6", fontFamily: "Poppins_600SemiBold", marginBottom: 6 },
  actionButton: { padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 15 },
  actionText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
});
