# Pocket Operator — Lynky Tech Assessment

Voice-driven mobile food pickup assistant (**Mobile** + **Backend**), built for the Lynky Tech Full Stack Mobile Application Developer assessment.

## Repository Structure

```text
lynky tech/
├── Backend/                               # Node.js 20+, Express microservices, PostgreSQL, Gemini
│   ├── gateway/                           # Public API gateway (PORT 3000)
│   ├── services/
│   │   ├── catalog-service/               # Restaurants & dishes (PORT 3001)
│   │   ├── order-service/                 # Proposals, atomic confirm, orders (PORT 3002)
│   │   └── assistant-service/             # Gemini tool loop, runs & steps (PORT 3003)
│   ├── database/                          # SQL migrations & Candidate Pack catalog.json seed
│   ├── scripts/export-trace.js            # CLI run trace exporter
│   └── tests/                             # Vitest + Supertest suite (tests 1–8)
├── Mobile/                                # React Native CLI (0.76.9) TypeScript Android app
│   ├── src/                               # Screens, hooks, components, API client, Maps, storage
│   ├── android/                           # Android native project + release APK build
│   └── MANUAL_TEST_CHECKLIST.md           # 10-case manual device verification checklist
└── README.md                              # This overview
```

## Prerequisites

- **Backend:** Node.js 20+, PostgreSQL 15+, Google Gemini API key (`GEMINI_API_KEY`)
- **Mobile:** Node.js 18+, JDK 17, Android SDK (`compileSdk 35`, `targetSdk 34`, `minSdk 24`), Android emulator or physical Android device

## Backend Setup, Run, Reset & Test

1. Configure environment variables (copy `Backend/.env.example` to `Backend/.env` and fill in secrets):
   ```bash
   cd Backend
   npm install
   ```
   See [Backend/.env.example](Backend/.env.example) for required variables (`DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `INTERNAL_KEY`, `DEV_TOKEN`, ports, timeouts).

2. Run migrations and seed from the supplied `catalog.json`:
   ```bash
   npm run migrate
   npm run seed
   ```

3. Start gateway + all 3 internal services:
   ```bash
   npm run dev
   # or production start:
   npm start
   ```

4. Run automated backend tests (uses `DATABASE_URL` if set, or `embedded-postgres` automatically):
   ```bash
   npm test
   ```

5. Export a run trace:
   ```bash
   npm run export-trace -- <run_id>
   ```

6. Reset all runs, proposals, orders, and reseed `catalog.json` via dev endpoint:
   ```bash
   curl -X POST http://localhost:3000/dev/reset \
     -H "x-dev-token: $DEV_TOKEN"
   ```

See [Backend/README.md](Backend/README.md) for the full API summary and `curl` examples (including `PATCH /dev/dishes/:id`).

## Mobile Setup, Backend URL & Release APK

1. Install dependencies:
   ```bash
   cd Mobile
   npm install
   ```

2. Set `BACKEND_URL` in [Mobile/src/config.ts](Mobile/src/config.ts):
   - Deployed HTTPS backend: `https://<your-backend-domain>`
   - Android emulator + local backend: `http://10.0.2.2:3000` (see [Mobile/README.md](Mobile/README.md) for temporary cleartext HTTP note during local testing)

3. Run Jest unit/render tests and TypeScript check:
   ```bash
   npx tsc --noEmit
   npm test
   ```

4. Build the installable Android release APK (signed with debug keystore for evaluation):
   ```bash
   cd Mobile/android
   ./gradlew assembleRelease
   ```
   APK output: [Mobile/android/app/build/outputs/apk/release/app-release.apk](Mobile/android/app/build/outputs/apk/release/app-release.apk)

   Install via ADB:
   ```bash
   adb install -r Mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

## Verification & Documentation

- **Backend Automated Tests:** `cd Backend && npm test`
- **Mobile Automated Tests & Typecheck:** `cd Mobile && npx tsc --noEmit && npm test`
- **Manual Device Checklist:** [Mobile/MANUAL_TEST_CHECKLIST.md](Mobile/MANUAL_TEST_CHECKLIST.md)
