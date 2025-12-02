import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Switch,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import Svg, { Line, Polyline, Circle, Rect, Path } from "react-native-svg";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { auth } from "../../Breath_Pacer/config/firebase";
import { saveOfflineSession } from "../../Breath_Pacer/utils/offlineSync";

const { width } = Dimensions.get("window");
const HEIGHT = 250;
const MAX_POINTS = 200;

type Phase = "Inhale" | "Hold Top" | "Exhale" | "Hold Bottom" | "Completed";

export default function BreathingOscilloscope() {
  const [data, setData] = useState<number[]>([]);
  const [phaseHistory, setPhaseHistory] = useState<Phase[]>([]); // Track phase for each data point
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // Track if session has started
  const [phase, setPhase] = useState<Phase>("Inhale");
  const [manualMode, setManualMode] = useState(false);

  // Times (seconds)
  const [inhaleTime, setInhaleTime] = useState(4);
  const [holdTopTime, setHoldTopTime] = useState(4);
  const [exhaleTime, setExhaleTime] = useState(4);
  const [holdBottomTime, setHoldBottomTime] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(5);

  // timers
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);

  const totalCycle = inhaleTime + holdTopTime + exhaleTime + holdBottomTime;

  async function playBeep() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
      });
      await sound.playAsync();
    } catch {
      console.log("Beep skipped (no internet or audio blocked).");
    }
  }

  function vibrate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // 🚀 Start breathing logic
  useEffect(() => {
    if (!running) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }

    const start = startTimeRef.current;
    const end = start + sessionMinutes * 60 * 1000 + totalPausedTimeRef.current;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now >= end) {
        stopSession();
        setPhase("Completed");
        saveSession(); // Save the completed session
        return;
      }

      const elapsed = ((now - start - totalPausedTimeRef.current) / 1000) % totalCycle;
      let value = 0;
      let newPhase: Phase = "Inhale";

      if (elapsed < inhaleTime) {
        const t = elapsed / inhaleTime;
        value = Math.sin((t * Math.PI) / 2);
        newPhase = "Inhale";
      } else if (elapsed < inhaleTime + holdTopTime) {
        value = 1;
        newPhase = "Hold Top";
      } else if (elapsed < inhaleTime + holdTopTime + exhaleTime) {
        const t = (elapsed - inhaleTime - holdTopTime) / exhaleTime;
        value = Math.cos((t * Math.PI) / 2);
        newPhase = "Exhale";
      } else {
        value = 0;
        newPhase = "Hold Bottom";
      }

      setPhase((prev) => {
        if (prev !== newPhase) {
          vibrate();
          playBeep();
        }
        return newPhase;
      });

      setData((prev) => [...prev, value].slice(-MAX_POINTS));
      setPhaseHistory((prev) => [...prev, newPhase].slice(-MAX_POINTS));
    }, 100);

    return stopSession;
  }, [running, inhaleTime, holdTopTime, exhaleTime, holdBottomTime, sessionMinutes]);

  function stopSession() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pausedTimeRef.current = Date.now();
  }

  async function saveSession() {
    if (!startTimeRef.current) return;

    const duration = Math.floor((Date.now() - startTimeRef.current - totalPausedTimeRef.current) / 1000);

    if (duration < 10) {
      console.log("Session too short, not saving");
      return;
    }

    const user = (auth as any).currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save sessions");
      return;
    }

    const session = {
      user_id: user.uid,
      duration_seconds: duration,
      inhale_seconds: inhaleTime,
      hold_seconds: holdTopTime,
      exhale_seconds: exhaleTime,
      exhale_hold_seconds: holdBottomTime,
      technique: "Breathing 2(Oscilloscope)",
      completed_at: new Date().toISOString(),
    };

    try {
      await saveOfflineSession(session);
      console.log("✅ Session saved successfully");
      Alert.alert("Success", `Session saved! Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    } catch (error) {
      console.error("❌ Failed to save session:", error);
      Alert.alert("Error", "Failed to save session");
    }
  }

  function reset() {
    stopSession();
    setPhase("Inhale");
    setData([]);
    setPhaseHistory([]);
    setRunning(false);
    setHasStarted(false); // Reset started state
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    totalPausedTimeRef.current = 0;
  }

  // GRAPH — Center scrolling with better amplitude
  const dx = width / MAX_POINTS;
  const centerX = width / 2;
  const PADDING = 30;
  const scaleY = (v: number) => HEIGHT - PADDING - v * (HEIGHT - 2 * PADDING);

  const points = data.length > 0
    ? data.map((y, i) => {
      const x = centerX + (i - data.length + 1) * dx;
      return `${x},${scaleY(y)}`;
    }).join(" ")
    : `0,${HEIGHT / 2} ${width},${HEIGHT / 2}`;

  // Debug
  console.log("🎨 SVG Rendering:", {
    width,
    HEIGHT,
    dataPoints: data.length,
    running,
    phase,
    hasPoints: points.length > 0
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0F2027" }}>
      <View style={styles.container}>
        <Text style={styles.title}>Breathing Oscilloscope</Text>
        <Text style={styles.phase}>Phase: {phase}</Text>

        {/* Oscilloscope - Full Continuous Line */}
        <View style={[styles.chart, { width, height: HEIGHT, position: 'relative', overflow: 'hidden' }]}>
          {/* Center reference line - VISIBLE */}
          <View style={{
            position: 'absolute',
            top: HEIGHT / 2 - 1,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#FFFFFF',
            opacity: 0.3
          }} />

          {/* Breathing wave as continuous line across full screen */}
          {data.length > 1 ? (
            data.map((value, i) => {
              if (i === 0) return null; // Skip first point

              const x1 = centerX + ((i - 1 - data.length + 1) * dx);
              const y1 = scaleY(data[i - 1]);
              const x2 = centerX + (i - data.length + 1) * dx;
              const y2 = scaleY(value);

              // Calculate line segment
              const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

              // Use the phase from when this segment was created
              const segmentPhase = phaseHistory[i] || phase;
              const color = segmentPhase === "Inhale" ? "#00FF00" :      // Green (lime)
                segmentPhase === "Exhale" ? "#FF0000" :       // Red
                  segmentPhase === "Hold Top" ? "#00FFFF" :     // Cyan
                    segmentPhase === "Hold Bottom" ? "#00FFFF" :  // Cyan
                      "#00FF00";

              return (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y1,
                    width: length,
                    height: 4,
                    backgroundColor: color,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: 'left center',
                    shadowColor: color,
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                  }}
                />
              );
            })
          ) : (
            <View style={{
              position: 'absolute',
              top: HEIGHT / 2 - 2,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: '#00FF00',
              shadowColor: '#00FF00',
              shadowOpacity: 0.6,
              shadowRadius: 3,
            }} />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Inhale" value={`${inhaleTime}s`} color="lime" />
          <Stat label="Hold" value={`${holdTopTime + holdBottomTime}s`} color="cyan" />
          <Stat label="Exhale" value={`${exhaleTime}s`} color="red" />
        </View>

        {/* Manual Toggle */}
        <Row label="Manual Mode" right={<Switch value={manualMode} onValueChange={setManualMode} />} />

        {/* Controls */}
        {manualMode ? (
          <>
            <Input label="Inhale" value={inhaleTime} setValue={setInhaleTime} />
            <Input label="Hold Top" value={holdTopTime} setValue={setHoldTopTime} />
            <Input label="Exhale" value={exhaleTime} setValue={setExhaleTime} />
            <Input label="Hold Bottom" value={holdBottomTime} setValue={setHoldBottomTime} />
            <Input label="Session (min)" value={sessionMinutes} setValue={setSessionMinutes} />
          </>
        ) : (
          <>
            <SliderRow label="Inhale" value={inhaleTime} setValue={setInhaleTime} />
            <SliderRow label="Hold Top" value={holdTopTime} setValue={setHoldTopTime} />
            <SliderRow label="Exhale" value={exhaleTime} setValue={setExhaleTime} />
            <SliderRow label="Hold Bottom" value={holdBottomTime} setValue={setHoldBottomTime} />
            <SliderRow label="Minutes" min={1} max={60} value={sessionMinutes} setValue={setSessionMinutes} />
          </>
        )}

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable
            style={[styles.btn, { flex: 1, backgroundColor: running ? "#E53935" : "#4CAF50" }]}
            onPress={() => {
              if (running) {
                stopSession();
                setRunning(false);
              } else {
                // Only reset timers if first time starting
                if (!hasStarted) {
                  startTimeRef.current = 0;
                  pausedTimeRef.current = 0;
                  totalPausedTimeRef.current = 0;
                } else if (pausedTimeRef.current > 0) {
                  // Calculate total paused time when resuming
                  totalPausedTimeRef.current += Date.now() - pausedTimeRef.current;
                  pausedTimeRef.current = 0;
                }
                setHasStarted(true);
                setRunning(true);
              }
            }}
          >
            <Text style={styles.btnTxt}>
              {running ? "Pause" : (hasStarted ? "Continue" : "Start")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.btn, { flex: 1, backgroundColor: "#808080" }]}
            onPress={reset}
          >
            <Text style={styles.btnTxt}>Reset</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

/* UI Helpers */
const Stat = ({ label, value, color }: any) => (
  <View style={[styles.statCard, { borderColor: color }]}>
    <Text style={{ color }}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const Row = ({ label, right }: any) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    {right}
  </View>
);

const SliderRow = ({ label, value, setValue, min = 1, max = 10 }: any) => (
  <View style={styles.sliderBox}>
    <Text style={styles.label}>{label}: {value}s</Text>
    <Slider minimumValue={min} maximumValue={max} step={1} value={value} onValueChange={setValue} />
  </View>
);

const Input = ({ label, value, setValue }: any) => (
  <View style={styles.sliderBox}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} keyboardType="numeric"
      value={String(value)} onChangeText={(t) => setValue(Number(t) || 0)} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 30,
  },
  title: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  phase: {
    fontSize: 18,
    color: "#4FC3F7",
    marginBottom: 15,
    fontWeight: "600",
    letterSpacing: 1,
  },
  chart: {
    backgroundColor: "#0a1929",
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(74, 144, 226, 0.3)",
    shadowColor: "#4a90e2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statsRow: {
    flexDirection: "row",
    width: "92%",
    justifyContent: "space-around",
    marginVertical: 20,
    gap: 12,
  },
  statCard: {
    borderWidth: 2,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  value: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  row: {
    width: "92%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  label: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  sliderBox: {
    width: "92%",
    marginVertical: 10,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  btn: {
    width: "92%",
    padding: 16,
    borderRadius: 25,
    marginTop: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  btnTxt: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
