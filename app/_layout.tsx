import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View, useColorScheme } from "react-native"; // Added missing imports
import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { Provider } from "react-redux";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { store } from "@/src/redux/store";
import { SpinnerProvider } from "@/src/contexts/SpinnerProvider";
import { SocketProvider } from "@/src/contexts/SocketProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(auth)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loaded, error] = useFonts({
    DMSansRegular: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansBold: DMSans_700Bold,
  });

  useEffect(() => {
    if (error) console.error("Font loading error:", error);
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  const theme = {
    background: isDark ? "#0F172A" : "#F8FAFC",
  };

  return (
    <SafeAreaProvider>
      <SocketProvider>
        <SpinnerProvider>
          <Provider store={store}>
            {/* Wrap the Stack in a View to apply global background colors */}
            <View
              style={[
                styles.contentContainer,
                { backgroundColor: theme.background },
              ]}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  // Enable smooth transitions
                  animation: "fade_from_bottom",
                }}
              />
            </View>

            <StatusBar
              style={isDark ? "light" : "dark"}
              backgroundColor={theme.background}
              translucent={true}
            />
          </Provider>
        </SpinnerProvider>
      </SocketProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});
