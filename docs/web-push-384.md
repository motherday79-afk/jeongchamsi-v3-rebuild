# Web push — release 384

## Entry points

- `/notifications`: member browser setup, Samsung Internet/Chrome guide, iPhone Safari home-screen guide, opt-in/out, self-test.
- `/admin/notifications`: highest administrator console menu, recipient count, compose, preview/confirmation, broadcast history.
- My Page and group announcements link to browser setup. Android native 383+ retains its existing native settings link. No APK build required.

## Delivery

`POST /api/v3/push/web` accepts register/status/disable/test for the authenticated active account. Same-origin writes only. The test targets that account's specified registered browser, with a 30-second server cooldown. VAPID keys are generated once using Redis SET NX and retained at `jcs:web-push:v1:vapid`; the private key never leaves server storage. Preserve this key during migrations/backups. Public subscriptions use only HTTPS FCM, Apple, or Mozilla push endpoints and validated P-256 keys.

Web subscriptions share group device bindings and logout revocation. Registration adds the member ID to `jcs:web-push:v1:members`, used to find opted-in recipients. Each account has a maximum of five devices under the shared limit. Devices expire from storage after 180 days; account binding, active account, and group membership/preferences are checked at delivery. Expired endpoints are removed. Every received push displays a notification; the worker does not intercept page requests or cache authenticated content.

Group and administrator broadcasts use the existing `completion-push` queue. Broadcast payloads use `webBroadcastId`; chunks contain up to five members, with per-device receipts retained for 90 days to skip accepted deliveries on retry. Transient errors are retried per device up to five attempts. Exhausted devices are recorded as failed while later recipients continue; jobs older than 24 hours are cancelled. Pending work is recovered by the existing watchdog and administrator history requests. Broadcast creation has an atomic idempotency key and 60-second cooldown. Only the highest administrator can create or inspect broadcasts. The sender's access is checked again in the worker.

History reports provider acceptance, not device receipt/read confirmation. An ambiguous provider/network failure may cause a retransmission; a stable notification tag replaces an earlier notification for the same event. Whole-account logout revokes registered devices, following the existing group push policy. Users must explicitly enable browser notifications again after logging back in.

## Device acceptance by owner

Android: open `/notifications` in Samsung Internet or Chrome, sign in, enable, grant permission, send self-test, inspect system notification tray. Each browser is a separate subscription.

iPhone: iOS 16.4+, Safari → Share → Add to Home Screen (Open as Web App if shown). Open the new home-screen icon, sign in if needed, My Page → Web notification settings → Enable → Allow → Send test. Safari tab alone cannot subscribe on iPhone.

Whole-member broadcast: enable own browser first, administrator menu → All member web push → write copy/path → confirm recipients → send. This is a live broadcast, not an automatic developer test.

Focused automated tests cover device identity, opt-out/account switching, protected endpoints, VAPID key stability, permanent failures, native/group compatibility, broadcast permission/idempotency, worker visibility, safe click routing and escaping. Actual notification display depends on browser/OS permission, focus modes, battery and connectivity; owner performs device acceptance.
