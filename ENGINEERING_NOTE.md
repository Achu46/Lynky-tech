# Engineering Note — Pocket Operator

## 1. Architecture

Pocket Operator separates mobile device interaction, AI orchestration, catalog truth, and order confirmation across explicit service boundaries:

- **Mobile App (`Mobile/`, React Native CLI 0.76.9 + TypeScript):**
  - Handles push-to-talk speech-to-text (`@react-native-voice/voice`, locale `en-IN`) with an editable transcript and always-available text fallback.
  - Persists `session_id`, conversation messages, `activeRunId` (for follow-up turns), and any pending `order_proposal` + its client-generated `Idempotency-Key` in `AsyncStorage`.
  - Refreshes pending proposals on app resume (`AppState` `'active'`) via `GET /api/proposals/:id`.
  - Executes Android Maps handoff (`geo:` intent first, `https://www.google.com/maps/search/...` browser fallback) and reports the actual result back to `POST /api/orders/:id/directions-result`.
- **Backend (`Backend/`, Node.js 20+ / Express / PostgreSQL):**
  - `gateway` (`:3000`): Single public HTTP entry point (`helmet`, `cors`, 100 KB JSON limit); forwards `/api/*` with `x-internal-key` and protects `/dev/*` with `x-dev-token`.
  - `catalog-service` (`:3001`): Source of truth for `restaurants` and `dishes`.
  - `order-service` (`:3002`): Owns `order_proposals` and `orders`. Enforces cheapest-valid proposal rules on creation and runs confirmation in a single PostgreSQL transaction (`SELECT ... FOR UPDATE`, `Idempotency-Key` + `proposal_id` deduplication, fresh catalog price/availability check, `409 STALE_PROPOSAL` replacement without silent substitution, and `SAVEPOINT` `unique_violation` recovery).
  - `assistant-service` (`:3003`): Runs a bounded tool-calling loop (`MAX_ITERATIONS = 5`, 15s per LLM call, 30s per run) with Zod-validated allowlisted tools (`search_menu`, `prepare_order`, `get_last_order`, `request_directions`, `ask_user`). Dish names and descriptions are wrapped in `<UNTRUSTED_MENU_DATA>` tags, and missing budget/dietary constraints are rejected in code (not just in the prompt).

## 2. Model / Provider Choice

- **Provider & Model:** Google Gemini (`@google/genai`), `gemini-2.5-flash` (configurable via `GEMINI_MODEL`).
- **Why:** Native structured function calling, fast first-token/tool-turn latency suitable for voice interactions, and low per-request cost compared to larger reasoning models.

## 3. Latency & Approximate Model Cost

- **Observed / Expected Run Latency:**
  - In automated backend tests with a mocked `LlmClient` against local PostgreSQL, `/api/agent/run` completes in ~50–150 ms.
  - With live `gemini-2.5-flash` over HTTPS, a typical 2-turn tool run (`search_menu` -> `prepare_order` -> final summary) involves 3 sequential LLM calls plus 2 localhost HTTP/SQL lookups, typically ~1.5–3.5 seconds end-to-end depending on network latency.
- **Approximate Model Cost (Estimated):**
  - Assumptions: ~900 input tokens + ~150 output tokens per LLM turn × 3 turns per typical order request ≈ 2,700 input tokens and 450 output tokens per run.
  - Using Gemini 2.5 Flash public list pricing (~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens), one typical multi-step request costs roughly **$0.0007** (under 0.1 cent, or ~₹0.06 INR).

## 4. Known Limitations

1. **Shared PostgreSQL instance:** All three backend services connect to one PostgreSQL database (isolated by table ownership and zero cross-service foreign keys, rather than separate physical databases).
2. **Synchronous localhost HTTP calls:** `order-service` and `assistant-service` communicate over localhost HTTP inside `start.js` with a narrow check-then-insert window during confirmation (mitigated by row locking `order_proposals` `FOR UPDATE` and unique DB constraints).
3. **Android voice recognition dependency:** `@react-native-voice/voice` relies on Android/Google Speech Services being present on the device; emulators without Google App fall back to editable text input.
4. **Release signing:** The evaluation APK is signed with the standard React Native debug keystore (`android/app/build.gradle`) and should not be used for Play Store distribution.
5. **Test environment scope:** Backend tests ran against real PostgreSQL 19 via `embedded-postgres` with a mocked `LlmClient`; Mobile automated checks verified TypeScript compilation, Jest unit/render tests (mocked native modules/network), and Android `assembleRelease` APK packaging, while physical-device mic and Maps flows remain covered by [Mobile/MANUAL_TEST_CHECKLIST.md](Mobile/MANUAL_TEST_CHECKLIST.md).

## 5. First Two Production Improvements

1. **Authentication, Per-User Scoping & Rate Limiting:** Replace anonymous `session_id` with verified JWT/OAuth user identity on the gateway, scope `orders` / `order_proposals` / `assistant_runs` by `user_id`, and add per-user rate limits on `/api/agent/run`.
2. **Observability & Service Isolation:** Add OpenTelemetry distributed tracing across gateway and services, centralize structured logs, move secrets into a managed secrets store, and deploy services independently behind private networking with an outbox/queue for async events.

## 6. AI Assistance & Reused Code Disclosure

- **AI Coding Assistance:** Built with AI coding assistant support (Antigravity / Gemini) for scaffolding Express services, SQL migrations, Vitest/Jest tests, React Native CLI TypeScript screens/hooks, and Gradle troubleshooting. All generated code, schema constraints, and test outputs were reviewed and verified directly.
- **Reused Libraries / Skeletons:** Standard React Native CLI (`0.76.9`) project template, Express, `pg`, `zod`, `@google/genai`, `@react-navigation/bottom-tabs`, `@react-native-async-storage/async-storage`, `@react-native-voice/voice`, `@react-native-clipboard/clipboard`, `vitest`, `supertest`, and `embedded-postgres`.
