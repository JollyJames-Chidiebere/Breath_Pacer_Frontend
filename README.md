# Breath Pacer - Frontend

A beautiful React Native breathing exercise app that helps users practice controlled breathing techniques with visual guidance and session tracking.

## Features

- **Two Breathing Modes:**
  - **Breathing 1**: Customizable breathing patterns with adjustable inhale, hold, exhale, and exhale-hold durations
  - **Breathing 2 (Oscilloscope)**: Real-time visual oscilloscope display with color-coded breathing phases

- **Session Tracking**: View your breathing session history with timestamps and technique details

- **Offline Support**: Sessions are saved locally and synced when you're back online

- **Firebase Authentication**: Secure user authentication and personalized data

- **Beautiful Dashboard**: Track total sessions, minutes practiced, and recent activity

## Tech Stack

- **React Native** with Expo
- **TypeScript**
- **React Navigation** for routing
- **Axios** for API calls
- **Firebase** for authentication
- **AsyncStorage** for offline data
- **React Native SVG** for visualizations

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or Expo Go app on your phone)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JollyJames-Chidiebere/Breath_Pacer_Frontend.git
cd Breath_Pacer_Frontend/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `frontend/` directory:
```env
EXPO_PUBLIC_API_URL=your_backend_url_here
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
```

4. Start the development server:
```bash
npx expo start
```

5. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Configuration

The app connects to a Django backend. Make sure your backend is running and the `EXPO_PUBLIC_API_URL` in your `.env` file points to your backend URL.

Backend repository: [Breath_Pacer_Backend](https://github.com/JollyJames-Chidiebere/Breath_Pacer_Backend)

## Project Structure

```
frontend/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Dashboard
│   │   ├── breathing1.tsx     # Breathing Mode 1
│   │   ├── breathing2.tsx     # Breathing Mode 2 (Oscilloscope)
│   │   └── settings.tsx       # Settings
├── Breath_Pacer/utils/
│   ├── api.ts                 # API configuration
│   ├── firebase.ts            # Firebase setup
│   └── offlineSync.ts         # Offline sync logic
└── assets/                    # Images and fonts
```

## Usage

1. **Sign Up/Login**: Create an account or log in with Firebase
2. **Choose a Breathing Mode**: Select Breathing 1 or Breathing 2
3. **Customize Settings**: Adjust breathing durations to your preference
4. **Start Session**: Follow the visual guide for your breathing pattern
5. **Track Progress**: View your session history on the dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## Author

**Wallace Godwin Besombe Divine** and

**JollyJames-Chidiebere**

## Links

- Backend Repository: [Breath_Pacer_Backend](https://github.com/JollyJames-Chidiebere/Breath_Pacer_Backend)
- Deployed Backend: [Railway Backend](https://your-railway-url.up.railway.app)

---

Made with using React Native and Expo

