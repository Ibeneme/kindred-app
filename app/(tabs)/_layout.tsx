import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import {
  Home,
  MessageCircle,
  Bell,
  User,
  AlertOctagon,
  RefreshCcw,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import { fetchNotifications } from "@/src/redux/slices/notificationSlice";
import { Conversation } from "./inbox";
import { useFocusEffect } from "@react-navigation/native";
import { useSocket } from "@/src/contexts/SocketProvider";
import { getFamilies } from "@/src/redux/slices/familySlice";
import { fetchUserProfile } from "@/src/redux/slices/userSlice";

const PRIMARY_YELLOW = "#EAB308";
const INACTIVE_COLOR = "#94A3B8";
const BADGE_RED = "#EF4444";

export default function TabLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useSocket();
  const { user } = useSelector((state: RootState) => state.user);

  // Local loading state for the retry button
  const [isRetrying, setIsRetrying] = useState(false);

  // Check if status is suspended
  const isSuspended = user?.status === "suspended";

  const onRetry = async () => {
    setIsRetrying(true);
    try {
      // Use unwrap to catch the end of the lifecycle locally
      await dispatch(fetchUserProfile()).unwrap();
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      dispatch(getFamilies());
      dispatch(fetchUserProfile());
    }, [dispatch])
  );

  const { unreadCount: notificationUnreadCount } = useSelector(
    (state: RootState) => state.notifications
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const totalUnreadMessages = useMemo(() => {
    return conversations.reduce(
      (total, conv) => total + (conv.unreadCount || 0),
      0
    );
  }, [conversations]);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  // ... (Socket logic logic remains unchanged)

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: PRIMARY_YELLOW,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.label,
          // Physically remove tab access if suspended
          tabBarButton: isSuspended ? () => null : undefined,
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
              <TabIcon
                Icon={MessageCircle}
                color={color}
                focused={focused}
                badgeCount={totalUnreadMessages}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Alerts",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                Icon={Bell}
                color={color}
                focused={focused}
                badgeCount={notificationUnreadCount}
              />
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

      {/* SUSPENSION MODAL OVERLAY */}
      <Modal visible={isSuspended} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.indicator} />

            <View style={styles.content}>
              <View style={styles.iconCircle}>
                <AlertOctagon color={BADGE_RED} size={40} />
              </View>

              <AppText type="bold" style={styles.modalTitle}>
                Account Suspended
              </AppText>

              <AppText style={styles.modalMessage}>
                Your account has been suspended for violating our community
                guidelines. Please contact support if you believe this is an
                error.
              </AppText>

              <TouchableOpacity
                style={[styles.retryButton, isRetrying && { opacity: 0.7 }]}
                onPress={onRetry}
                disabled={isRetrying}
              >
                <RefreshCcw
                  color="#FFF"
                  size={20}
                  style={{
                    marginRight: 8,
                    transform: [{ rotate: isRetrying ? "45deg" : "0deg" }],
                  }}
                />
                <AppText type="bold" style={styles.retryText}>
                  {isRetrying ? "Checking Status..." : "Retry Connection"}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const TabIcon = ({ Icon, color, focused, badgeCount }: any) => (
  <View style={styles.iconContainer}>
    <Icon color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
    {badgeCount !== undefined && badgeCount > 0 && (
      <View style={styles.badgeContainer}>
        <AppText style={styles.badgeText} type="bold">
          {badgeCount > 9 ? "9+" : badgeCount}
        </AppText>
      </View>
    )}
    {focused && <View style={styles.activeDot} />}
  </View>
);

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    height: Platform.OS === "ios" ? 88 : 78,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    elevation: 20,
  },
  label: { fontSize: 12, fontWeight: "600" },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: 50,
  },
  activeDot: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY_YELLOW,
  },
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: 8,
    backgroundColor: BADGE_RED,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    textAlign: "center",
    lineHeight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)", // Slightly darker for better focus
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32, // More rounded for modern feel
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 34,
    paddingTop: 12,
  },
  indicator: {
    width: 36,
    height: 5,
    backgroundColor: "#CBD5E1",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  content: {
    alignItems: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    color: "#0F172A",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    width: "100%",
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: "#FFF",
    fontSize: 16,
  },
});
