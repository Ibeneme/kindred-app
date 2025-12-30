import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { useSocket } from "@/src/contexts/SocketProvider";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/ui/AppText";
import { User as UserIcon, Search } from "lucide-react-native";

interface Conversation {
  _id: string; // This is the roomUuid
  lastMessage: string;
  timestamp: string;
  senderName: string;
  senderId: string;
  unreadCount: number;
  // Note: In a real app, you'd likely join with a User collection
  // to get the receiverName accurately. For now, we use senderName.
}

const InboxScreen = () => {
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useSelector((state: RootState) => state.user);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket || !user?._id) return;

    // 1. Request the conversation list
    socket.emit("get_conversations", { userId: user._id });

    // 2. Listen for the list response
    socket.on("conversations_list", (data: Conversation[]) => {
      setConversations(data);
      setLoading(false);
    });

    // 3. Listen for real-time unread updates to refresh the list
    const updateHandler = () => {
      socket.emit("get_conversations", { userId: user._id });
    };

    socket.on(`unread_update_${user._id}`, updateHandler);
    socket.on(`latest_msg_${user._id}`, updateHandler);

    return () => {
      socket.off("conversations_list");
      socket.off(`unread_update_${user._id}`, updateHandler);
      socket.off(`latest_msg_${user._id}`, updateHandler);
    };
  }, [socket, user?._id]);

  const handleConversationPress = (item: Conversation) => {
    // Generate the same room UUID logic
    // If the room _id is already the combined string, use it directly
    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: item._id, // The Room UUID
        senderId: user?._id,
        senderName: `${user?.firstName} ${user?.lastName}`,
        receiverId: item.senderId === user?._id ? "other_id" : item.senderId, // Logic depends on your aggregation
        receiverName: item.senderName,
      },
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const time = new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatar}>
          <UserIcon size={24} color="#64748B" />
        </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <AppText type="bold" style={styles.name}>
              {item.senderName}
            </AppText>
            <AppText style={styles.time}>{time}</AppText>
          </View>

          <View style={styles.row}>
            <AppText
              numberOfLines={1}
              style={[
                styles.lastMsg,
                item.unreadCount > 0 && styles.unreadText,
              ]}
            >
              {item.lastMessage}
            </AppText>

            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>{item.unreadCount}</AppText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText type="bold" style={styles.headerTitle}>
          Messages
        </AppText>
        <TouchableOpacity style={styles.iconBtn}>
          <Search size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <AppText style={{ color: "#64748B" }}>No messages yet.</AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 24, color: "#111827" },
  iconBtn: { padding: 8, backgroundColor: "#F8FAFC", borderRadius: 12 },
  list: { paddingVertical: 8 },
  card: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flex: 1, marginLeft: 12, justifyContent: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, color: "#111827" },
  time: { fontSize: 12, color: "#94A3B8" },
  lastMsg: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    flex: 1,
    marginRight: 8,
  },
  unreadText: { color: "#111827", fontWeight: "600" },
  badge: {
    backgroundColor: "#EF4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
});

export default InboxScreen;
