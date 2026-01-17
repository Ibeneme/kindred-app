import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/src/redux/store";
import { useSocket } from "@/src/contexts/SocketProvider";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/ui/AppText";
import { User as UserIcon, Search, Filter } from "lucide-react-native";

export interface Conversation {
  _id: string;
  lastMessage: string;
  timestamp: string;
  senderName: string;
  senderId: string;
  receiverId: string;
  unreadCount: number;
  profilePicture?: string;
}

const InboxScreen = () => {
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useSelector((state: RootState) => state.user);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket || !user?._id) return;

    socket.on("conversations_list", (data: Conversation[]) => {
      setConversations(data);
      setFilteredConversations(data);
      setLoading(false);
      setRefreshing(false);
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
            profilePicture:
              updatedConv.profilePicture || existingItem.profilePicture,
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

  // Search and filter logic
  useEffect(() => {
    let filtered = conversations;

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.senderName.toLowerCase().includes(lowerQuery) ||
          conv.lastMessage.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const toggleFilter = () => {
    setShowFilter(!showFilter);
    // Add your filter logic here (e.g., unread only, recent, etc.)
    if (!showFilter) {
      // Example filter: show unread only
      const unreadOnly = conversations.filter((c) => c.unreadCount > 0);
      setFilteredConversations(unreadOnly);
    } else {
      setFilteredConversations(conversations);
    }
  };

  const handleConversationPress = (item: Conversation) => {
    const otherUserId =
      item.senderId === user?._id ? item.receiverId : item.senderId;

    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: item._id,
        senderId: user?._id,
        senderName: `${user?.firstName} ${user?.lastName}`,
        receiverId: otherUserId,
        receiverName: item.senderName,
        receiverProfilePicture: item.profilePicture || "",
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
          {item.profilePicture ? (
            <Image
              source={{ uri: item.profilePicture }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.placeholderIcon}>
              <UserIcon size={28} color="#94A3B8" />
            </View>
          )}
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
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Search size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleFilter}>
            <Filter size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search conversations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#111827"]}
              tintColor="#111827"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <AppText style={{ color: "#64748B" }}>No messages found.</AppText>
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
  headerIcons: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 8, backgroundColor: "#F8FAFC", borderRadius: 12 },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    fontSize: 16,
    color: "#111827",
  },
  list: { paddingVertical: 8, flexGrow: 1 },
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
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderIcon: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  unreadText: { color: "#111827", fontWeight: "700" },
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
    marginTop: 50,
  },
});

export default InboxScreen;
