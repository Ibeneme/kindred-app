import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { Home, MessageCircle, Bell, User } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import { fetchNotifications } from "@/src/redux/slices/notificationSlice";
import { Conversation } from "./inbox"; // Ensure this path is correct
import { useFocusEffect } from "@react-navigation/native";
import { useSocket } from "@/src/contexts/SocketProvider";

const PRIMARY_YELLOW = "#EAB308";
const INACTIVE_COLOR = "#94A3B8";
const BADGE_RED = "#EF4444";

export default function TabLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useSocket();
  const { user } = useSelector((state: RootState) => state.user);

  // Get unreadCount from Redux notifications slice
  const { unreadCount: notificationUnreadCount } = useSelector(
    (state: RootState) => state.notifications
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);

  // --- START TOTAL UNREAD CALCULATION ---
  const totalUnreadMessages = useMemo(() => {
    return conversations.reduce(
      (total, conv) => total + (conv.unreadCount || 0),
      0
    );
  }, [conversations]);
  // --- END TOTAL UNREAD CALCULATION ---

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const fetchConversations = useCallback(() => {
    if (socket && user?._id) {
      socket.emit("get_conversations", { userId: user._id });
    }
  }, [socket, user?._id]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    if (!socket || !user?._id) return;

    socket.on("conversations_list", (data: Conversation[]) => {
      setConversations(data);
    });

    const handleLatestMsg = (updatedConv: any) => {
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c._id === updatedConv._id);
        const updatedList = [...prev];

        if (existingIndex !== -1) {
          const existingItem = updatedList[existingIndex];
          const isMe = updatedConv.senderId === user._id;

          const mergedItem = {
            ...existingItem,
            lastMessage: updatedConv.lastMessage,
            timestamp: updatedConv.timestamp,
            unreadCount: isMe
              ? existingItem.unreadCount
              : (existingItem.unreadCount || 0) + 1,
          };

          updatedList.splice(existingIndex, 1);
          updatedList.unshift(mergedItem);
        } else {
          updatedList.unshift({
            ...updatedConv,
            unreadCount: updatedConv.senderId === user._id ? 0 : 1,
          });
        }
        return updatedList;
      });
    };

    socket.on(`latest_msg_${user._id}`, handleLatestMsg);

    return () => {
      socket.off("conversations_list");
      socket.off(`latest_msg_${user._id}`, handleLatestMsg);
    };
  }, [socket, user?._id]);

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
            <TabIcon
              Icon={MessageCircle}
              color={color}
              focused={focused}
              badgeCount={totalUnreadMessages} // Total from socket state
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
              badgeCount={notificationUnreadCount} // Redux count
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
  );
}

const TabIcon = ({
  Icon,
  color,
  focused,
  badgeCount,
}: {
  Icon: any;
  color: string;
  focused: boolean;
  badgeCount?: number;
}) => (
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
    backgroundColor: BADGE_RED, // BACKGROUND RED
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    zIndex: 10,
  },
  badgeText: {
    color: "#FFFFFF", // TEXT WHITE
    fontSize: 8,
    textAlign: "center",
    lineHeight: 10,
  },
});
