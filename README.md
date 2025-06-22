# HealthMate - Expo Native

A comprehensive health management application built with Expo Native, featuring medication tracking, appointment scheduling, and medical diary functionality.

## 🚀 Migration to Expo Native

This app has been successfully migrated from Expo Go to Expo Native (Development Build) for enhanced functionality and native performance.

## 📋 Prerequisites

Before getting started, ensure you have:

- Node.js (v18 or later)
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli@latest`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- A device or emulator for testing

## 🛠 Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Login to your Expo account:**
   ```bash
   eas login
   ```

3. **Configure your project:**
   ```bash
   eas init
   ```

## 🔧 Development Build Setup

### First Time Setup

1. **Create a development build:**
   
   For Android:
   ```bash
   npm run build:development:android
   ```
   
   For iOS:
   ```bash
   npm run build:development:ios
   ```

2. **Install the development build on your device:**
   - Download the APK/IPA from your EAS build dashboard
   - Install it on your device or emulator

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Connect to your development build:**
   - Open the installed development build app
   - Scan the QR code or enter the development server URL

### Daily Development

Once you have the development build installed:

```bash
npm start
```

The app will hot-reload your changes without needing to rebuild.

## 🏗 Building for Production

### Preview Builds (Internal Testing)

For Android:
```bash
npm run build:preview:android
```

For iOS:
```bash
npm run build:preview:ios
```

### Production Builds (App Store/Play Store)

For Android:
```bash
npm run build:production:android
```

For iOS:
  ```bash
npm run build:production:ios
```

## 📱 Features

- **Medication Tracking**: Schedule and track medication intake
- **Appointment Management**: Schedule and manage medical appointments
- **Medical Diary**: Keep track of health records and notes
- **Calendar Integration**: Sync with device calendar
- **Notifications**: Smart medication reminders
- **Biometric Authentication**: Secure login with fingerprint/Face ID
- **Multi-language Support**: Internationalization ready

## 🔧 Key Technologies

- **Expo SDK 52** with Native Development Build
- **React Native 0.76.6**
- **Supabase** for backend services
- **React Navigation 7** for navigation
- **Expo Modules**: Calendar, Notifications, Image Picker, Local Authentication
- **React Native Paper** for UI components

## 📂 Project Structure

```
HealthMate/
├── src/
│   ├── App/                 # Main app screens
│   │   ├── General/         # Home, Calendar, Medication screens
│   │   ├── Medic/          # Doctor-related screens
│   │   ├── Profile/        # User profile screens
│   │   ├── Settings/       # App settings
│   │   └── Appointments/   # Appointment management
│   ├── Authentication/     # Login/Register screens
│   ├── Components/         # Reusable components
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── navigation/            # Navigation configuration
├── assets/               # Images, icons, videos
└── Configuration files
```

## 🔐 Environment Setup

1. **Supabase Configuration:**
   - Update `supabase.js` with your Supabase URL and API key
   - Ensure your database schema matches the expected tables

2. **App Configuration:**
   - Update bundle identifiers in `app.json` if needed
   - Configure push notification certificates (iOS)
   - Set up Google Services (Android) if using additional features

## 🚨 Important Notes

### Rebuilding Requirements

You need to create a new development build when:
- Adding new native dependencies
- Changing app configuration (`app.json`)
- Updating Expo SDK version
- Modifying plugins

### No Rebuild Required

Hot reloading works for:
- JavaScript/TypeScript code changes
- React component updates
- Styling changes
- Most app logic modifications

## 🧪 Testing

### Local Testing
```bash
npm start
```

### Device Testing
1. Install the development build on your device
2. Connect to the development server
3. Test all features including:
   - Camera/Photo picker
   - Calendar integration
   - Push notifications
   - Biometric authentication

## 📦 Dependencies

### Core Dependencies
- `expo`: ~52.0.26
- `react-native`: ^0.76.6
- `@react-navigation/native`: ^7.0.14
- `@supabase/supabase-js`: ^2.49.1

### Expo Modules
- `expo-notifications`: ~0.29.13
- `expo-calendar`: ~14.0.6
- `expo-image-picker`: ~16.0.4
- `expo-local-authentication`: ~15.0.1
- `expo-av`: ~15.0.2
- `expo-crypto`: ~14.0.1
- `expo-constants`: ^17.0.8

### UI & Navigation
- `react-native-paper`: ^5.14.5
- `react-native-reanimated`: ^3.16.6
- `react-native-gesture-handler`: ~2.20.2

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   ```

2. **Development build not connecting:**
   - Ensure your device and computer are on the same network
   - Check firewall settings
   - Restart the development server

3. **Permission issues:**
   - Check that all permissions are properly configured in `app.json`
   - Ensure permission requests are implemented in code

4. **Build failures:**
   - Check EAS build logs for specific errors
   - Ensure all native dependencies are compatible
   - Verify app.json configuration

### Getting Help

- Check the Expo documentation: https://docs.expo.dev
- Review build logs in EAS dashboard
- Check React Native compatibility for third-party packages

## 🚀 Deployment

1. **Test thoroughly** with development builds
2. **Create preview builds** for internal testing
3. **Generate production builds** for app stores
4. **Submit to app stores** using EAS Submit or manually

## 📄 License

This project is licensed under the 0BSD License.

---

**Note:** This app uses Expo Native (Development Build) and requires building custom development clients. It cannot run in Expo Go due to the native dependencies and custom configurations required.

