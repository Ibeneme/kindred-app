import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { setupCallKeep } from "@/src/hooks/CallKeepService";


SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(auth)",
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

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
    background: isDark ? "#fff" : "#fff",
  };

  return (
    <View
      style={[
        styles.contentContainer,
        {
          backgroundColor: theme.background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
        }}
      />
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={theme.background}
        translucent={true}
      />
    </View>
  );
}

export default function RootLayout() {
  // ✅ Call setup only once when the app starts
  useEffect(() => {
    setupCallKeep();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <SocketProvider>
            <SpinnerProvider>
              <RootLayoutNav />
            </SpinnerProvider>
          </SocketProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});
