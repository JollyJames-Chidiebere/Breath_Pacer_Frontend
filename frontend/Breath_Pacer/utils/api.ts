// utils/api.ts
import axios from "axios";
import { auth } from "../config/firebase";
import { Platform } from "react-native";

// CONFIGURE YOUR API ENDPOINTS HERE:
const USE_PRODUCTION = true; // ✅ Using Railway backend

const PRODUCTION_API = "https://web-production-c5bc.up.railway.app"; // Railway backend
const LOCAL_API = "http://192.168.2.13:8000"; // Your local backend IP

const API_BASE = USE_PRODUCTION ? PRODUCTION_API : LOCAL_API;

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000, // 10 second timeout
});

// Add detailed request/response logging
api.interceptors.request.use(
    (config) => {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error("❌ API Request Error:", error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
        return response;
    },
    (error) => {
        console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status}`);
        console.error("❌ Error Data:", error.response?.data);
        return Promise.reject(error);
    }
);

// Helper to get Firebase token
const getAuthToken = async () => {
    const user = auth.currentUser;
    if (user) {
        return await user.getIdToken();
    }
    return null;
};

export default api;

// Example endpoints
export const registerUser = async (email: string, password: string) => {
    const response = await api.post("/api/register/", { email, password });
    return response.data;
};

export const getUserProfile = async (token: string) => {
    const response = await api.get("/api/profile/", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

// Fetch user breathing sessions
export const fetchUserSessions = async () => {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const response = await api.get("/api/sessions/", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

// Fetch user progress/stats
export const fetchUserProgress = async () => {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const response = await api.get("/api/user_progress/summary/", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};
