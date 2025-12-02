import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
  Easing,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { api as API } from "../../Breath_Pacer/utils/api";
import { auth } from "../../Breath_Pacer/config/firebase";
import {
  saveOfflineSession,
  uploadOfflineSessions,
  setupNetworkListener,
} from "../../Breath_Pacer/utils/offlineSync";

const COLORS = {
  inhale: "#4DB6AC",
  hold: "#81C784",
  exhale: "#E5C07B",
  background: ["#0F2027", "#203A43", "#2C5364"] as const,
};

type PhaseName = "Inhale" | "HoldTop" | "Exhale" | "HoldBottom";

export default function Breathing1() {
  // Timing settings (in seconds)
  const [inhale, setInhale] = useState(4);
  const [inhaleHold, setInhaleHold] = useState(4);
  const [exhale, setExhale] = useState(4);
  const [exhaleHold, setExhaleHold] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(10);

  // Session state
  const [phase, setPhase] = useState < PhaseName > ("Inhale");
  const [timeLeft, setTimeLeft] = useState(inhale);
  const [totalSeconds, setTotalSeconds] = useState(sessionMinutes * 60);
  const [vibrationOn, setVibrationOn] = useState(true);
  const [paused, setPaused] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Animation values
  const circleSize = useRef(new RNAnimated.Value(150)).current;      // core circle size
  const phaseProgress = useRef(new RNAnimated.Value(0)).current;     // 0-1 for each phase
  const haloScale = useRef(new RNAnimated.Value(1)).current;         // glowing halo scale
  const haloOpacity = useRef(new RNAnimated.Value(0)).current;       // glowing halo opacity

  // Timer reference
  const sessionTimerRef = useRef < ReturnType < typeof setInterval > | null > (null);

  // Pause-resume tracking
  const pausedPhaseIndex = useRef(0);
  const pausedTimeInPhase = useRef(0);

  // -------------------------------
  // Network + offline sync
  // -------------------------------
  useEffect(() => {
    const unsubscribe = setupNetworkListener();
    uploadOfflineSessions();
    return unsubscribe;
  }, []);

  // -------------------------------
  // Load settings on mount
  // -------------------------------
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem("breathingSettings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setInhale(parsed.inhale ?? 4);
          setInhaleHold(parsed.inhaleHold ?? 4);
          setExhale(parsed.exhale ?? 4);
          setExhaleHold(parsed.exhaleHold ?? 4);
          setSessionMinutes(parsed.sessionMinutes ?? 10);
          setVibrationOn(parsed.vibrationOn ?? true);
          setTotalSeconds((parsed.sessionMinutes ?? 10) * 60);
          setTimeLeft(parsed.inhale ?? 4);
        }
      } catch (err) {
        console.error("Error loading settings", err);
      }
    };
    loadSettings();
  }, []);

  // -------------------------------
  // Save settings whenever changed
  // -------------------------------
  useEffect(() => {
    const saveSettings = async () => {
      const settings = {
        inhale,
        inhaleHold,
        exhale,
        exhaleHold,
        sessionMinutes,
        vibrationOn,
      };
      await AsyncStorage.setItem("breathingSettings", JSON.stringify(settings));
    };
    saveSettings();
  }, [inhale, inhaleHold, exhale, exhaleHold, sessionMinutes, vibrationOn]);

  // -------------------------------
  // Haptics + chime
  // -------------------------------
  const playHapticCue = async () => {
    if (!vibrationOn) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  };

  const playChime = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/chime.mp3")
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // ignore
    }
  };

  // -------------------------------
  // Backend sync
  // -------------------------------
  const syncSessionToBackend = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();

      await API.post(
        "/api/sessions/",
        {
          duration_seconds: sessionMinutes * 60,
          technique: "Breathing 1",
          inhale_seconds: inhale,
          hold_seconds: inhaleHold,
          exhale_seconds: exhale,
          exhale_hold_seconds: exhaleHold,
          device: "mobile",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Synced", "Your breathing session was saved.");
    } catch (error) {
      console.error("Failed to sync, saving offline:", error);
      await saveOfflineSession({
        duration_seconds: sessionMinutes * 60,
        technique: "Breathing 1",
        inhale_seconds: inhale,
        hold_seconds: inhaleHold,
        exhale_seconds: exhale,
        exhale_hold_seconds: exhaleHold,
        device: "mobile",
      });
      Alert.alert("Offline", "Session saved locally and will sync later.");
    }
  };

  // -------------------------------
  // ANIMATIONS – Advanced visuals
  // -------------------------------
  const animateCircle = (phaseName: PhaseName, duration: number) => {
    // Main circle size logic
    const targetSize =
      phaseName === "Inhale" || phaseName === "HoldTop" ? 250 : 150;

    RNAnimated.timing(circleSize, {
      toValue: targetSize,
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Phase progress (0 → 1)
    phaseProgress.setValue(0);
    RNAnimated.timing(phaseProgress, {
      toValue: 1,
      duration: duration * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Halo pulse: stronger on inhale, softer on exhale/holds
    const maxHaloOpacity =
      phaseName === "Inhale" ? 0.9 : phaseName === "Exhale" ? 0.6 : 0.4;

    haloOpacity.setValue(0);
    haloScale.setValue(0.9);

    RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.timing(haloScale, {
          toValue: 1.2,
          duration: (duration * 1000) / 2,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        RNAnimated.timing(haloScale, {
          toValue: 1,
          duration: (duration * 1000) / 2,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(haloOpacity, {
          toValue: maxHaloOpacity,
          duration: (duration * 1000) / 3,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        RNAnimated.timing(haloOpacity, {
          toValue: 0,
          duration: (duration * 1000) * (2 / 3),
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

  // -------------------------------
  // BREATHING LOOP
  // -------------------------------
  const startBreathing = (resumeFromPause = false) => {
    stopBreathing();

    const steps: { name: PhaseName; time: number }[] = [
      { name: "Inhale", time: inhale },
      { name: "HoldTop", time: inhaleHold },
      { name: "Exhale", time: exhale },
      { name: "HoldBottom", time: exhaleHold },
    ];

    let index = resumeFromPause ? pausedPhaseIndex.current : 0;
    let currentTime = resumeFromPause
      ? pausedTimeInPhase.current
      : steps[index].time;

    if (!resumeFromPause) {
      setTotalSeconds(sessionMinutes * 60);
    }

    setPhase(steps[index].name);
    setTimeLeft(currentTime);
    animateCircle(steps[index].name, currentTime);

    sessionTimerRef.current = setInterval(() => {
      // 1. Decrease total session time and stop when done
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(sessionTimerRef.current as number);
          endSession();
          return 0;
        }
        return prev - 1;
      });

      // 2. Handle current phase countdown
      currentTime -= 1;
      if (currentTime > 0) {
        setTimeLeft(currentTime);
      } else {
        // move to next phase
        playHapticCue();
        index = (index + 1) % steps.length;
        currentTime = steps[index].time;
        setPhase(steps[index].name);
        setTimeLeft(currentTime);
        animateCircle(steps[index].name, currentTime);
      }

      pausedPhaseIndex.current = index;
      pausedTimeInPhase.current = currentTime;
    }, 1000);
  };

  const stopBreathing = () => {
    if (sessionTimerRef.current !== null) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };

  const endSession = () => {
    stopBreathing();
    setPaused(true);
    setSessionComplete(true);
    playChime();
    syncSessionToBackend();
  };

  const resetSession = () => {
    stopBreathing();
    setPaused(true);
    setHasStarted(false);
    setSessionComplete(false);
    setPhase("Inhale");
    setTimeLeft(inhale);
    setTotalSeconds(sessionMinutes * 60);
  };

  // -------------------------------
  // Helpers
  // -------------------------------
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const getPhaseLabel = (p: PhaseName) => {
    switch (p) {
      case "Inhale":
        return "Inhale 🌬️";
      case "Exhale":
        return "Exhale 🌪️";
      case "HoldTop":
        return "Hold 🌕";
      case "HoldBottom":
        return "Hold 🌑";
      default:
        return "";
    }
  };

  const animatedCircleStyle = {
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize.interpolate({
      inputRange: [150, 250],
      outputRange: [75, 125],
    }),
  };

  const phaseColor =
    phase === "Inhale"
      ? COLORS.inhale
      : phase === "Exhale"
        ? COLORS.exhale
        : COLORS.hold;

  const progressRingScale = phaseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.1],
  });

  // -------------------------------
  // Completion screen
  // -------------------------------
  if (sessionComplete) {
    return (
      <LinearGradient
        colors={COLORS.background}
        style={styles.container}
      >
        <View style={styles.completeContainer}>
          <Text style={styles.completeText}>Session Complete 🎉</Text>
          <Text style={styles.stats}>
            Total Duration: {sessionMinutes} minutes
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: "#808080" }]}
            onPress={resetSession}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  // -------------------------------
  // MAIN UI
  // -------------------------------
  return (
    <LinearGradient
      colors={COLORS.background}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ alignItems: "center" }}>
        <Text style={styles.instructions}>
          {getPhaseLabel(phase)} • Session: {formatTime(totalSeconds)}
        </Text>

        <Text style={[styles.timer, { color: phaseColor }]}>{timeLeft}</Text>

        <View style={styles.pacerContainer}>
          {/* Outer glowing halo */}
          <RNAnimated.View
            style={[
              styles.halo,
              {
                borderColor: phaseColor,
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />

          {/* Phase progress ripple */}
          <RNAnimated.View
            style={[
              styles.progressRing,
              {
                borderColor: phaseColor,
                transform: [{ scale: progressRingScale }],
              },
            ]}
          />

          {/* Core breathing circle */}
          <RNAnimated.View
            style={[
              animatedCircleStyle,
              { backgroundColor: `${phaseColor}33` },
            ]}
          >
            <View style={styles.innerCircle}>
              <Text style={styles.innerPhase}>{getPhaseLabel(phase)}</Text>
            </View>
          </RNAnimated.View>
        </View>

        {/* Settings shown only when paused */}
        {paused && (
          <>
            <View style={styles.settingRow}>
              <Text style={styles.label}>Manual Mode</Text>
              <Switch value={manualMode} onValueChange={setManualMode} />
            </View>

            {manualMode ? (
              <>
                <StepperField
                  label="Inhale Time"
                  value={inhale}
                  setValue={setInhale}
                />
                <StepperField
                  label="Hold Top Time"
                  value={inhaleHold}
                  setValue={setInhaleHold}
                />
                <StepperField
                  label="Exhale Time"
                  value={exhale}
                  setValue={setExhale}
                />
                <StepperField
                  label="Hold Bottom Time"
                  value={exhaleHold}
                  setValue={setExhaleHold}
                />
                <StepperField
                  label="Session Length"
                  value={sessionMinutes}
                  setValue={setSessionMinutes}
                  unit="min"
                  step={1}
                  min={1}
                />
              </>
            ) : (
              <>
                <SliderControl
                  label="Inhale Time"
                  value={inhale}
                  setValue={setInhale}
                />
                <SliderControl
                  label="Hold Top Time"
                  value={inhaleHold}
                  setValue={setInhaleHold}
                />
                <SliderControl
                  label="Exhale Time"
                  value={exhale}
                  setValue={setExhale}
                />
                <SliderControl
                  label="Hold Bottom Time"
                  value={exhaleHold}
                  setValue={setExhaleHold}
                />
                <SliderControl
                  label="Session Length (minutes)"
                  value={sessionMinutes}
                  setValue={setSessionMinutes}
                  min={1}
                  max={60}
                />
              </>
            )}

            <View style={styles.settingRow}>
              <Text style={styles.label}>Vibration</Text>
              <Switch value={vibrationOn} onValueChange={setVibrationOn} />
            </View>
          </>
        )}

        {/* Controls */}
        <View style={styles.buttons}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: paused ? "#4caf50" : "#e53935" },
            ]}
            onPress={() => {
              setPaused(!paused);
              if (paused) {
                startBreathing(hasStarted);
                setHasStarted(true);
              } else {
                stopBreathing();
              }
            }}
          >
            <Text style={styles.buttonText}>
              {paused ? (hasStarted ? "Continue" : "Start") : "Pause"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: "#808080" }]}
            onPress={resetSession}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ---------- STEP CONTROLS ---------- */
interface StepperFieldProps {
  label: string;
  value: number;
  setValue: (val: number) => void;
  unit?: string;
  step?: number;
  min?: number;
}

const StepperField: React.FC<StepperFieldProps> = ({
  label,
  value,
  setValue,
  unit = "s",
  step = 0.5,
  min = 0,
}) => {
  const increase = () => setValue(parseFloat((value + step).toFixed(1)));
  const decrease = () =>
    setValue(Math.max(min, parseFloat((value - step).toFixed(1))));

  return (
    <View style={styles.inputField}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperContainer}>
        <TouchableOpacity style={styles.stepperButton} onPress={decrease}>
          <Text style={styles.stepperText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.valueText}>
          {value.toFixed(1)}
          {unit}
        </Text>
        <TouchableOpacity style={styles.stepperButton} onPress={increase}>
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

type SliderControlProps = {
  label: string;
  value: number;
  setValue: (val: number) => void;
  min?: number;
  max?: number;
};

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  setValue,
  min = 1,
  max = 10,
}) => (
  <>
    <Text style={styles.label}>
      {label}: {value}
    </Text>
    <Slider
      style={styles.slider}
      minimumValue={min}
      maximumValue={max}
      step={1}
      value={value}
      onValueChange={setValue}
    />
  </>
);

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  instructions: { fontSize: 16, color: "#fff", marginBottom: 5 },
  timer: { fontSize: 60, fontWeight: "bold", marginBottom: 20 },
  pacerContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  halo: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 6,
  },
  progressRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    opacity: 0.4,
  },
  innerCircle: { flex: 1, justifyContent: "center", alignItems: "center" },
  innerPhase: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  label: { fontSize: 16, color: "#fff", marginTop: 10 },
  slider: { width: "80%", marginVertical: 5 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "80%",
    marginVertical: 10,
  },
  buttons: { flexDirection: "row", marginTop: 20, gap: 15 },
  button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25 },
  buttonText: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  inputField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "80%",
    marginVertical: 5,
  },
  completeContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  completeText: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  stats: { fontSize: 16, color: "#fff", marginVertical: 5 },
  stepperContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperButton: {
    backgroundColor: "#4caf50",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepperText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  valueText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    minWidth: 60,
    textAlign: "center",
  },
});
