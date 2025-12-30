import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { Home, MessageCircle, Bell, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const PRIMARY_YELLOW = "#EAB308";
const INACTIVE_COLOR = "#94A3B8";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY_YELLOW,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,

      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MessageCircle} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Bell} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * A sub-component to handle the icon + active dot logic
 */
const TabIcon = ({
  Icon,
  color,
  focused,
}: {
  Icon: any;
  color: string;
  focused: boolean;
}) => (
  <View style={styles.iconContainer}>
    <Icon color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
    {focused && <View style={styles.activeDot} />}
  </View>
);

import { TouchableOpacity } from "react-native";

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute", // Makes it look modern/floating
    height: Platform.OS === "ios" ? 88 : 68,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Platform.OS === "ios" ? 0 : 10,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: 50,
  },

});
