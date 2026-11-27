# Pocket Operator — Manual Test Checklist

| # | Test Case | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| 1 | Voice permission denied | Tap **Tap to Speak**, deny `RECORD_AUDIO` permission. | Shows `"Voice is unavailable. You can type instead"` with **Open Settings** button; text input + **Send** still works; no crash. | |
| 2 | Empty recording | Tap **Tap to Speak**, stay silent, tap **Listening... Tap to Stop**. | Shows `"I did not catch anything, try again"`; nothing is sent to the backend. | |
| 3 | App background / resume with pending proposal | Ask for `"cheapest vegetarian lunch up to 200"`, wait for `ProposalCard`, press Home/background app (or kill & reopen), then return to app. | Pending proposal remains visible; on resume app calls `GET /proposals/:id` and keeps card if still `pending` (or drops it if resolved). | |
| 4 | Network failure then retry on confirm | Turn off network/Wi-Fi, tap **Confirm Order**. Turn network back on, tap **Retry Confirm**. | Shows `"Could not reach the server. Retry"` with Retry button; retry reuses the same `Idempotency-Key` and returns the single order. | |
| 5 | Double tap Confirm | Quickly tap **Confirm Order** twice on a valid proposal. | Button disables immediately while request is in flight; backend receives at most one confirm (or same `Idempotency-Key`), producing exactly 1 order. | |
| 6 | Stale proposal after changing availability | Prepare proposal for `m4`, run `PATCH /dev/dishes/m4 {available:false}`, then tap **Confirm Order**. | Shows `"Price or availability changed"` banner and new proposal (`m1`) requiring a fresh tap of **Confirm Order** (never auto-confirms). | |
| 7 | Maps installed | Confirm an order with directions requested (or tap **Open directions** in History) on a device with Google Maps. | Opens Maps app via `geo:` URI; reports `maps_opened`; UI shows `"Maps opened"`. | |
| 8 | Maps missing (browser fallback) | Disable/uninstall Maps handler on emulator/device and tap **Open directions**. | Falls back to `https://www.google.com/maps/search/?api=1&query=...` in browser; reports `browser_fallback_opened`; UI shows `"Browser fallback opened"`. | |
| 9 | History after app restart | Force-close the app completely, reopen it, and switch to the **History** tab. | Saved orders still appear from `GET /api/orders` with `"Sandbox order saved"`, directions status, and **Open directions** button. | |
| 10 | `"Order this on Swiggy"` message | Send `"Order this on Swiggy"` via voice or text. | Assistant explains Swiggy/delivery/payments are unsupported and offers the local sandbox pickup flow; no proposal or order is created. | |
