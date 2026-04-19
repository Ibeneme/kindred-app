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
import {
  User as UserIcon,
  Search,
  ListFilter,
  MessageSquarePlus,
} from "lucide-react-native";

export interface Conversation {
  _id: string; // This is the roomUuid
  lastMessage: string;
  timestamp: string;
  senderName: string; // Now correctly represents the 'Other Person'
  senderId: string; // Now correctly represents the 'Other Person'
  receiverId: string; // Usually the current user
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
  const [isFilterActive, setIsFilterActive] = useState(false);

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
      setFilteredConversations(data);
      setLoading(false);
      setRefreshing(false);
    });

    // Handle incoming messages while the inbox is open
    const handleLatestMsg = (updatedConv: any) => {
      setConversations((prev) => {
        const existingIndex = prev.findIndex(
          (c) => c._id === updatedConv.roomUuid
        );
        const updatedList = [...prev];

        // Determine the 'Other Person' details for the UI
        const isMeSender = updatedConv.senderId === user._id;
        const chatPartnerName = isMeSender
          ? "Family Member"
          : updatedConv.senderName;
        const chatPartnerId = isMeSender
          ? updatedConv.receiverId
          : updatedConv.senderId;

        const formattedConv: Conversation = {
          _id: updatedConv.roomUuid,
          lastMessage: updatedConv.lastMessage || updatedConv.message,
          timestamp: updatedConv.timestamp,
          senderName: chatPartnerName,
          senderId: chatPartnerId,
          receiverId: user._id,
          unreadCount: isMeSender ? 0 : updatedConv.unreadCount || 1,
          profilePicture: updatedConv.profilePicture,
        };

        if (existingIndex !== -1) {
          updatedList.splice(existingIndex, 1);
        }
        updatedList.unshift(formattedConv);
        return updatedList;
      });
    };

    socket.on(`latest_msg_${user._id}`, handleLatestMsg);

    return () => {
      socket.off("conversations_list");
      socket.off(`latest_msg_${user._id}`, handleLatestMsg);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    let filtered = conversations;
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (c) =>
          c.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (isFilterActive) {
      filtered = filtered.filter((c) => c.unreadCount > 0);
    }
    setFilteredConversations(filtered);
  }, [searchQuery, conversations, isFilterActive]);

  const handleConversationPress = (item: Conversation) => {
    // Navigation logic: item.senderId is now guaranteed to be the other person by the backend logic
    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: item._id,
        senderId: user?._id,
        senderName: `${user?.firstName} ${user?.lastName}`,
        receiverId: item.senderId, // The other person
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
    const isUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.6}
        style={styles.convCard}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          {item.profilePicture ? (
            <Image
              source={{ uri: item.profilePicture }}
              style={styles.avatarImg}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <UserIcon size={24} color="#94A3B8" />
            </View>
          )}
          {isUnread && <View style={styles.activeDot} />}
        </View>

        <View style={styles.convContent}>
          <View style={styles.convHeader}>
            <AppText type="bold" style={styles.senderName}>
              {item.senderName}
            </AppText>
            <AppText style={[styles.timeText, isUnread && styles.unreadTime]}>
              {time}
            </AppText>
          </View>

          <View style={styles.msgPreviewRow}>
            <AppText
              numberOfLines={1}
              style={[styles.msgSnippet, isUnread && styles.msgSnippetUnread]}
            >
              {item.lastMessage}
            </AppText>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <AppText style={styles.unreadBadgeText}>
                  {item.unreadCount}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.topHeader}>
        <View>
          <AppText type="bold" style={styles.pageTitle}>
            Messages
          </AppText>
          <AppText style={styles.subTitle}>
            {conversations.length} total chats
          </AppText>
        </View>
        <TouchableOpacity style={styles.composeBtn}>
          <MessageSquarePlus size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            placeholder="Search people or messages..."
            placeholderTextColor="#94A3B8"
            style={styles.searchField}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            onPress={() => setIsFilterActive(!isFilterActive)}
            style={[
              styles.filterToggle,
              isFilterActive && styles.filterToggleActive,
            ]}
          >
            <ListFilter
              size={18}
              color={isFilterActive ? "#EAB308" : "#64748B"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.scrollList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchConversations}
              tintColor="#EAB308"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <MessageSquarePlus size={32} color="#CBD5E1" />
              </View>
              <AppText type="bold" style={styles.emptyTitle}>
                No conversations yet
              </AppText>
              <AppText style={styles.emptyText}>
                When you start a chat, it will appear here.
              </AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  pageTitle: { fontSize: 28, color: "#0F172A", letterSpacing: -0.5 },
  subTitle: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  composeBtn: {
    backgroundColor: "#0F172A",
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  searchWrapper: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    borderRadius: 15,
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchField: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1E293B" },
  filterToggle: { padding: 6, borderRadius: 8 },
  filterToggleActive: { backgroundColor: "#FEF9C3" },
  scrollList: { paddingHorizontal: 16, paddingBottom: 40 },
  convCard: {
    flexDirection: "row",
    padding: 14,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  avatarContainer: { position: "relative" },
  avatarImg: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  convContent: { flex: 1, marginLeft: 15 },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  senderName: { fontSize: 16, color: "#1E293B" },
  timeText: { fontSize: 12, color: "#94A3B8" },
  unreadTime: { color: "#EAB308", fontWeight: "700" },
  msgPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  msgSnippet: { fontSize: 14, color: "#64748B", flex: 1, marginRight: 10 },
  msgSnippetUnread: { color: "#0F172A", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: "#EAB308",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  loadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  emptyTitle: { fontSize: 18, color: "#334155" },
  emptyText: { fontSize: 14, color: "#94A3B8", marginTop: 5 },
});

export default InboxScreen;
