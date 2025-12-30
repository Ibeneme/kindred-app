import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { AppText } from "@/src/ui/AppText";
import { getAuthToken } from "@/src/redux/services/secureStore";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("🔍 Checking auth token...");
        const token = await getAuthToken();
        console.log("🔐 Auth token:", token);

        if (token) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/(auth)/sign-in");
        }
      } catch (error) {
        console.error("❌ Auth check error:", error);
        router.replace("/(auth)/sign-in");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#EAB308" />
        <AppText style={styles.text} type="bold">
          Loading Kindred...
        </AppText>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDFBF7",
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
});
