package com.jeongchamsi.preview;
import android.content.Context;
import android.view.View;
/** Compile-only API contract. This .class MUST NOT enter the APK.
 * The runtime implementation is the exact IntroView class from the user's APK. */
public final class IntroView extends View {
    public IntroView(Context context) { super(context); throw new AssertionError("JCS_COMPILE_ONLY_STUB"); }
    public void setOnFinished(Runnable callback) { throw new AssertionError("JCS_COMPILE_ONLY_STUB"); }
}
