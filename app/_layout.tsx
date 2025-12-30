// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
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
//import { StripeProvider } from "@stripe/stripe-react-native";
// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(auth)",
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSansRegular: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansBold: DMSans_700Bold,
  });

  useEffect(() => {
    if (error) {
      console.error("Font loading error:", error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    //     <StripeProvider
    //       publishableKey="pk_test_your_key_here"
    // //      merchantIdentifier="merchant.com.kindred"
    //     >
    <SocketProvider>
      <SpinnerProvider>
        <Provider store={store}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <StatusBar style="auto" />
        </Provider>
      </SpinnerProvider>
    </SocketProvider>
    // </StripeProvider>
  );
}
