# Android loading168 review

Independent read-only reviewer examined MainActivity, StartupGate, DocumentFailure, DocumentNavigation and build/test wiring against167.

Resolved before delivery:
- Preserve main-frame HTTP errors that arrive before commit-time onPageStarted.
- Block fresh retry from probing the previous document.
- Invalidate pending callbacks and already-ready state when accepting a new full-document navigation.
- Preserve the expected destination error even if unrelated stale requests fail afterward.

Final assessment: no remaining important issue found within this scope. Reviewer independently compiled models and ran StartupTest:3406 checks passed. No physical-device/live WebView integration verification.

Chromium callback ordering sources:
https://chromium.googlesource.com/chromium/src/+/refs/heads/main/android_webview/browser/network_service/aw_proxying_url_loader_factory.cc
https://chromium.googlesource.com/chromium/src/+/refs/heads/main/android_webview/java/src/org/chromium/android_webview/AwWebContentsObserver.java
https://chromium.googlesource.com/chromium/src/+/refs/heads/main/android_webview/java/src/org/chromium/android_webview/AwComputedFlags.java
