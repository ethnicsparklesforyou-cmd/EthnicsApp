# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep JavaScript interface
-keepclassmembers class * {
    native <methods>;
}

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Navigation / Screens
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# Keep app classes
-keep class com.jwelleryapp.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }

# Suppress warnings for missing classes
-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn okio.**
