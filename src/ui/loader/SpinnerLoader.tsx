import React, { useRef, useEffect, useCallback } from "react";
import { Animated, StyleSheet, View, Platform, ViewStyle } from "react-native";
import { Image } from "expo-image"; // Ensure you use expo-image for better performance
import { BlurView } from "expo-blur";
import ImportedImages from "../../../assets/images/kindred.png";

type Props = {
  visible?: boolean;
  size?: number; // size of the spinner
  overlayColor?: string; // fallback overlay color (used mainly if blur fails or on Android as part of the stack)
  containerPadding?: number;
  blurIntensity?: number; // blur intensity
};

const SpinnerLoader: React.FC<Props> = ({
  visible = true,
  size = 48,
  overlayColor = "rgba(0,0,0,0.4)",
  containerPadding = 8,
  blurIntensity = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  // Start pulse animation
  const startPulse = useCallback(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    animation.current = pulse;
  }, [scaleAnim]);

  // Stop pulse
  const stopPulse = useCallback(() => {
    animation.current?.stop();
    animation.current = null;
    scaleAnim.setValue(0.5);
  }, [scaleAnim]);

  useEffect(() => {
    if (visible) startPulse();
    else stopPulse();
    return () => stopPulse();
  }, [visible, startPulse, stopPulse]);

  if (!visible) return null;

  return (
    <View
      style={[styles.overlay, { backgroundColor: overlayColor } as ViewStyle]}
      pointerEvents="auto"
    >
      {/* Full-screen blur */}
      {Platform.OS === "android" ? (
        <View style={StyleSheet.absoluteFill}>
          {/* Fallback overlay for Android */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]}
          />
          <BlurView
            intensity={blurIntensity}
            style={StyleSheet.absoluteFill}
            tint="default"
          />
        </View>
      ) : (
        <BlurView
          intensity={blurIntensity}
          style={StyleSheet.absoluteFill}
          tint="dark"
        />
      )}

      {/* Animated Spinner */}
      <Animated.View
        style={[
          styles.container,
          {
            padding: containerPadding,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={ImportedImages}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

export default SpinnerLoader;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    // Optional: Add a subtle background color here if the spinner image is transparent
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
  },
});
