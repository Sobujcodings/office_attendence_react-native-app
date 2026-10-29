# Office Attendance (Android)

Automatically records when you arrive at and leave the office. All data stays on the phone (SQLite).

## Features
- Automatic check-in/out: geofence, office WiFi (works with location off), and a 15-minute background check
- Today: live timer, progress toward the daily target, Late/Short/Overtime badges, detection status, last-7-days chart
- History: browse by month, monthly stats (present days, total, average in/out, late days), absent and weekend days, CSV export
- Corrections: change an entry's time, delete it, or add a missed entry (marked as Manual)
- Work schedule: office start time, grace period, daily target, weekend days
- Light and dark mode (follows the phone setting)

## How detection works

| Detector | When it runs | File |
|---|---|---|
| Geofence (GPS) | The moment you enter or leave the office radius, even when the app is closed | `src/tasks/definitions.ts` |
| Periodic check (WiFi + location) | About every 15 minutes in the background, on app open, and on WiFi changes while the app is open | `src/services/attendance.ts` → `reconcile()` |

**With location off:** Android hides the WiFi name, so the office WiFi is recognised by its network address (e.g. `192.168.10.0/24`) and confirmed by the office's public IP.
- Connecting to the office WiFi → check-in (up to 15 minutes late in the background)
- Office WiFi gone → check-out at the last time the WiFi was seen
- Between 8 and 11 AM, if location is off and nothing was recorded, one reminder notification per day
- When location comes back on, the geofence is re-registered on every check

Every signal goes through `handleSignal()`, which makes the final decision:
- Already inside today → ENTER is ignored
- Back within 10 minutes of an exit (40 minutes for WiFi/periodic checks) → that exit is cancelled (GPS drift or a short step out)
- GPS exit while still on the office WiFi → exit is ignored
- Day summary = first IN, last OUT, and total time inside

## Structure

```
index.ts                 registers background tasks, then the app
App.tsx                  boot + tabs
src/
  constants.ts, types.ts, theme.ts
  db/                    SQLite: events table + kv (settings)
  services/
    attendance.ts        core logic (handleSignal, reconcile)
    geofence.ts          OS geofence registration
    background.ts        15-minute periodic task
    wifi.ts              WiFi name, network address, public IP matching
    edits.ts             manual corrections
    export.ts            CSV export
    notify.ts, permissions.ts, setup.ts, store.ts, bus.ts
  tasks/definitions.ts   background task handlers
  hooks/                 useAttendance, useMonth, useSettings, usePermissions, useWifiWatcher
  utils/                 date, stats, geo, async, pickTime
  components/, screens/  UI
```

## Next steps

### 1. Install packages
```bash
npm install
npm run typecheck
```

### 2. Try the UI in Expo Go (optional)
```bash
npx expo start --lan
```
Scan the QR code with Expo Go. Background detection and notifications do not run in Expo Go.

### 3. Build the APK (one command, needs a free Expo account)
```bash
npm run build
```
This runs `scripts/build-apk.mjs`, which:
1. Checks you're logged in to Expo (asks you to log in if not)
2. Type checks the code
3. Runs `expo-doctor`
4. Builds the APK on Expo's servers (about 10–20 minutes) and prints an install link and QR code

Each build gets a higher version code automatically, so a new APK installs over the old one and keeps your data.

On the phone: open the install link (or scan the QR code), tap **Install**, and allow "Install unknown apps" for your browser. Every build is also listed at expo.dev → your project → Builds.

### 4. Set up on the phone (once, at the office)
1. Enter your name
2. Location → **Allow all the time**
3. Allow notifications (optional)
4. Battery optimization → this app → **Don't optimize / No restrictions**
   - Xiaomi: Settings → Apps → Office Attendance → Autostart ON, Battery saver → No restrictions
5. While connected to the office WiFi, tap **"I'm at the office now"**
6. Tap **Get started**

## Limitations
- Nothing is detected while the phone is off
- GPS accuracy is 50–200 m, so times can be off by 1–5 minutes; periodic checks can be up to 15 minutes late
- With battery optimization on, some phones stop background tasks
