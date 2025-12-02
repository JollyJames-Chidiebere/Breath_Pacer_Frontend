// app/(tabs)/index.tsx
import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useFonts, Poppins_400Regular, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { auth } from "../../Breath_Pacer/config/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { fetchUserSessions, fetchUserProgress } from "../../Breath_Pacer/utils/api";

interface SessionData {
  id: number;
  duration_seconds: number;
  inhale_seconds: number;
  hold_seconds: number;
  exhale_seconds: number;
  exhale_hold_seconds: number;
  technique?: string; // Breathing technique used
  created_at: string;
}

interface ProgressData {
  total_sessions: number;
  total_minutes: number;
  last_session: string | null;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  // Clear old sessions from storage (temporary - for migration)
  useEffect(() => {
    const clearOldSessions = async () => {
      await AsyncStorage.removeItem("unsentSessions");
      console.log("🗑️ Cleared old sessions from storage");
    };
    clearOldSessions();
  }, []); // Run only once on mount

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Check if user has logged in before
        const hasLoggedInBefore = await AsyncStorage.getItem(`hasLoggedIn_${currentUser.uid}`);

        if (hasLoggedInBefore === "true") {
          setIsReturningUser(true);
        } else {
          // First time login after signup
          setIsReturningUser(false);
        }

        // Fetch dashboard data
        await loadDashboardData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Refresh dashboard when user navigates to this tab
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user])
  );

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sessionsData, progressData] = await Promise.all([
        fetchUserSessions().catch(() => []),
        fetchUserProgress().catch(() => ({ total_sessions: 0, total_minutes: 0, last_session: null }))
      ]);

      setSessions(Array.isArray(sessionsData) ? sessionsData.slice(0, 100) : []);
      setProgress(progressData || { total_sessions: 0, total_minutes: 0, last_session: null });
    } catch (error) {
      console.log("Dashboard will show without backend data");
      setSessions([]);
      setProgress({ total_sessions: 0, total_minutes: 0, last_session: null });
    } finally {
      setLoading(false);
    }
  };

  // Animated value for floating effect
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  // Handle logout
  const handleLogout = async () => {
    try {
      if (user) {
        // Mark that this user has logged in before (for next time)
        await AsyncStorage.setItem(`hasLoggedIn_${user.uid}`, "true");
      }
      await signOut(auth);
      setIsReturningUser(false); // Reset state on logout
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loader until fonts are ready
  if (!fontsLoaded) {
    return <ActivityIndicator size="large" color="#3EB489" style={{ flex: 1 }} />;
  }

  // Show authenticated home screen with dashboard
  if (user) {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3EB489" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      );
    }

    return (
      <LinearGradient
        colors={["#ffffff", "#d5e8d4"]}
        style={styles.containerFull}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {isReturningUser ? "Welcome Back" : "Welcome"}!
              </Text>
              <Text style={styles.userName}>
                {user.displayName || user.email?.split("@")[0] || "Friend"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButtonSmall}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Ionicons name="stats-chart" size={32} color="#3EB489" />
              <Text style={styles.statNumber}>{progress?.total_sessions || 0}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSecondary]}>
              <Ionicons name="time" size={32} color="#4CAF50" />
              <Text style={styles.statNumber}>{progress?.total_minutes || 0}</Text>
              <Text style={styles.statLabel}>Total Minutes</Text>
            </View>
          </View>

          {/* Recent Sessions */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={24} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
            </View>

            {sessions.length > 0 ? (
              sessions.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionIconContainer}>
                      <Ionicons name="fitness" size={24} color="#3EB489" />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDuration}>
                        {Math.floor(session.duration_seconds / 60)}:{(session.duration_seconds % 60).toString().padStart(2, "0")} min
                      </Text>
                      <Text style={styles.sessionTechnique}>
                        {session.technique || "Breathing 1"}
                      </Text>
                      <Text style={styles.sessionDate}>
                        {new Date(session.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })} at {new Date(session.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.breathingPattern}>
                    <View style={styles.patternItem}>
                      <Text style={styles.patternLabel}>Inhale</Text>
                      <Text style={styles.patternValue}>{session.inhale_seconds}s</Text>
                    </View>
                    <Text style={styles.patternDivider}>→</Text>
                    <View style={styles.patternItem}>
                      <Text style={styles.patternLabel}>Hold</Text>
                      <Text style={styles.patternValue}>{session.hold_seconds}s</Text>
                    </View>
                    <Text style={styles.patternDivider}>→</Text>
                    <View style={styles.patternItem}>
                      <Text style={styles.patternLabel}>Exhale</Text>
                      <Text style={styles.patternValue}>{session.exhale_seconds}s</Text>
                    </View>
                    {session.exhale_hold_seconds > 0 && (
                      <>
                        <Text style={styles.patternDivider}>→</Text>
                        <View style={styles.patternItem}>
                          <Text style={styles.patternLabel}>Hold</Text>
                          <Text style={styles.patternValue}>{session.exhale_hold_seconds}s</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cloud-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No sessions yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start your first breathing exercise!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Show login/signup screen for non-authenticated users
  return (
    <LinearGradient
      colors={["#ffffff", "#d5e8d4"]}
      style={styles.container}
    >
      {/* Animated Top Image */}
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Image
          source={require("../assets/images/first.png")}
          style={styles.staffImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Logo */}
      <Image
        source={require("../assets/images/Screenshot_2025-08-04_at_9.53.07_AM-removebg.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Welcome Text */}
      <Text style={styles.welcomeTitle}>Welcome to Bhakti Wellness Center</Text>
      <Text style={styles.subtitle}>
        Take a breath, soften your shoulders, and let go. You're just a few
        moments away from calm.
      </Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.signUpButton]}
          onPress={() => router.push("/authentication/signup")}
        >
          <Text style={styles.buttonTextLight}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => router.push("/authentication/login")}
        >
          <Text style={styles.buttonTextLight}>Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  containerFull: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#4a4a4a",
    fontFamily: "Poppins_400Regular",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#4a4a4a",
  },
  userName: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
    marginTop: 4,
  },
  logoutButtonSmall: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: "#3EB489",
  },
  statCardSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  statNumber: {
    fontSize: 36,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#4a4a4a",
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
  },
  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sessionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDuration: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
  },
  sessionTechnique: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#3EB489",
    marginTop: 2,
    fontStyle: "italic",
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#7f8c8d",
    marginTop: 4,
  },
  breathingPattern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  patternItem: {
    alignItems: "center",
  },
  patternLabel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#7f8c8d",
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#3EB489",
  },
  patternDivider: {
    fontSize: 16,
    color: "#bdc3c7",
    fontFamily: "Poppins_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#7f8c8d",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#95a5a6",
    marginTop: 4,
  },
  staffImage: { width: 200, height: 300, marginBottom: 10 },
  logo: { width: 260, height: 100, marginBottom: 100, marginTop: -10 },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#4a4a4a",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonRow: { flexDirection: "row", justifyContent: "center", width: "100%", marginTop: 10 },
  button: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 2,
  },
  signUpButton: { backgroundColor: "#3EB489" },
  loginButton: { backgroundColor: "#1e3628" },
  buttonTextLight: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#E74C3C",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
    alignSelf: "center",
  },
});
