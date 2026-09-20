# ?? Hemoglobin Monitor App (HbMonitorApp)

A mobile health (mHealth) screening application built with **React Native**, **TypeScript**, and **Supabase** to estimate and monitor hemoglobin levels non-invasively through guided image processing and colorimetric analysis.

---

## ?? Features

- ?? **Guided Camera Scan:** Step-by-step camera alignment with on-device image quality checks (brightness, focus, redness).
- ?? **Local Colorimetric Estimation:** Analyzes color features (RGB ratios, redness index) locally on the device.
- ?? **Demographic Adjustment:** Adjusts severity classification (Normal, Mild, Moderate, Severe) based on biological sex, age, and pregnancy status.
- ?? **Analytics & Trend Tracking:** Weekly averages, highest/lowest readings, and historical chart records.
- ?? **Supabase Backend:** Secure authentication and profile data synchronization.

---

## ??? Tech Stack

- **Framework:** React Native (CLI) 0.7x
- **Language:** TypeScript
- **Navigation:** React Navigation (Stack & Bottom Tabs)
- **Backend & Auth:** Supabase PostgreSQL
- **Camera & Processing:** React Native Vision Camera, Canvas/Image processors

---

## ?? Getting Started

### 1. Prerequisites
- Node.js >= 18
- JDK 17
- Android SDK & NDK

### 2. Installation
\\\ash
npm install
\\\

### 3. Setup Environment Variables
Create a \.env\ file in the root directory:
\\\env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
\\\

### 4. Running the App (Android)
\\\ash
# Start Metro
npm start

# Run Android build
npm run android
\\\

---

## ?? Building Release APK

\\\powershell
# 1. Bundle JavaScript assets
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 2. Build APK
cd android
.\gradlew assembleRelease
cd ..
\\\
The APK will be available at:
\ndroid/app/build/outputs/apk/release/app-release.apk\

---

## ?? Medical Disclaimer
This application is intended strictly for research, educational, and screening purposes. It is **not** a replacement for professional laboratory tests or certified medical advice.
