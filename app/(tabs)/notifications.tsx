import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  CheckCheck,
  Lightbulb,
  ClipboardList,
  BarChart3,
  UserPlus,
  FileText,
  Newspaper,
  Heart,
  Search,
  X,
  Users,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from "@/src/redux/slices/notificationSlice";
import { formatDistanceToNow } from "date-fns";
import { useGlobalSpinner } from "@/src/hooks/useGlobalSpinner";

/**
 * HELPER FUNCTIONS
 * Defined outside the component to prevent hoisting errors and unnecessary re-renders.
 */
const getTypeLabel = (type: string) => {
  switch (type) {
    case "NEW_SUGGESTION":
      return "New Suggestion";
    case "NEW_TASK":
      return "Task Assigned";
    case "NEW_DONATION":
    case "DONATION_CREATED":
      return "New Fundraiser";
    case "DONATION_UPDATED":
      return "Fund Updated";
    case "DONATION_DELETED":
      return "Fund Closed";
    case "MEMBER_JOINED":
      return "New Member";
    case "INVITATION_RECEIVED":
    case "FAMILY_INVITE":
      return "Family Invite";
    case "POLL_CREATED":
      return "New Poll";
    case "REPORT_SUBMITTED":
      return "New Report";
    case "REPORT_COMMENT":
      return "Report Comment";
    case "NEWS_UPDATE":
      return "Family News";
    case "FAMILY_UPDATE":
      return "Family Update";
    case "FAMILY_JOIN_ACCEPTED":
      return "Join Accepted";
    case "FAMILY_JOIN_REQUEST":
      return "Join Request";
    case "FAMILY_JOIN_DECLINED":
      return "Join Declined";
    default:
      return "Update";
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "DONATION_CREATED":
    case "DONATION_UPDATED":
    case "NEW_DONATION":
      return <Heart size={20} color="#EF4444" fill="#EF4444" />;
    case "DONATION_DELETED":
      return <Heart size={20} color="#9CA3AF" />;
    case "NEW_SUGGESTION":
      return <Lightbulb size={20} color="#EAB308" />;
    case "NEW_TASK":
      return <ClipboardList size={20} color="#3B82F6" />;
    case "POLL_CREATED":
      return <BarChart3 size={20} color="#8B5CF6" />;
    case "REPORT_SUBMITTED":
    case "REPORT_COMMENT":
      return <FileText size={20} color="#EF4444" />;
    case "NEWS_UPDATE":
    case "FAMILY_UPDATE":
      return <Newspaper size={20} color="#10B981" />;
    case "MEMBER_JOINED":
    case "INVITATION_RECEIVED":
    case "FAMILY_INVITE":
    case "FAMILY_JOIN_REQUEST":
    case "FAMILY_JOIN_ACCEPTED":
      return <UserPlus size={20} color="#10B981" />;
    default:
      return <Bell size={20} color="#6B7280" />;
  }
};

const NotificationsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [searchQuery, setSearchQuery] = useState("");

  const { notifications, loading, unreadCount } = useSelector(
    (state: RootState) => state.notifications
  );

  useGlobalSpinner(loading);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, []);

  const onRefresh = useCallback(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n: any) =>
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query) ||
        getTypeLabel(n.type).toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const handleNotificationPress = (notification: any) => {
    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }

    const familyId = notification.familyId;
    const type = notification.type;

    // Routing Logic
    if (
      ["DONATION_CREATED", "DONATION_UPDATED", "NEW_DONATION"].includes(type)
    ) {
      return router.push({
        pathname: "/family/[id]",
        params: { id: familyId },
      });
    }

    if (type === "NEW_SUGGESTION") {
      return router.push({
        pathname: "/family/[id]",
        params: { id: familyId },
      });
    }

    if (type === "NEW_TASK") {
      return router.push({
        pathname: "/family/[id]",
        params: { id: familyId },
      });
    }

    if (type === "POLL_CREATED") {
      return router.push({
        pathname: "/family/[id]",
        params: { id: familyId },
      });
    }

    if (["REPORT_SUBMITTED", "REPORT_COMMENT"].includes(type)) {
      return router.push({
        pathname: "/family/[id]",
        params: { id: familyId },
      });
    }

    if (type === "NEWS_UPDATE") {
      return router.push({
        pathname: "/family/news",
        params: { id: familyId },
      });
    }

    // Default: Route to the specific Family Dashboard for all other family-related types
    return router.push({
      pathname: "/family/[id]",
      params: { id: familyId },
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        {getNotificationIcon(item.type)}
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.labelRow}>
          <AppText type="bold" style={styles.typeLabel}>
            {getTypeLabel(item.type)}
          </AppText>
          <AppText style={styles.timeLabel}>
            {item.createdAt
              ? formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })
              : ""}
          </AppText>
        </View>

        <AppText type="bold" style={styles.notifTitle}>
          {item.title}
        </AppText>
        <AppText style={styles.notifMessage} numberOfLines={2}>
          {item.message}
        </AppText>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <AppText type="bold" style={styles.headerTitle}>
            Notifications
          </AppText>
          {unreadCount > 0 && (
            <AppText style={styles.unreadSub}>
              {unreadCount} unread items
            </AppText>
          )}
        </View>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={() => dispatch(markAllAsRead())}
        >
          <CheckCheck size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search updates..."
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor="#EAB308"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Bell size={60} color="#E5E7EB" />
              <AppText type="bold" style={styles.emptyTitle}>
                {searchQuery ? "No matches found" : "All caught up"}
              </AppText>
              <AppText style={styles.emptySubtitle}>
                {searchQuery
                  ? `Nothing matches "${searchQuery}"`
                  : "No notifications yet."}
              </AppText>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 24, color: "#111827" },
  unreadSub: {
    fontSize: 13,
    color: "#EAB308",
    marginTop: 2,
    fontWeight: "600",
  },
  markAllBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 12 },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    height: 45,
    marginLeft: 10,
    color: "#1E293B",
    fontSize: 14,
  },
  list: { paddingVertical: 5 },
  notifCard: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  unreadCard: { backgroundColor: "#FDFCF0" },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EAB308",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  contentContainer: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  timeLabel: { fontSize: 11, color: "#9CA3AF" },
  notifTitle: { fontSize: 15, color: "#111827", marginBottom: 3 },
  notifMessage: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyTitle: { fontSize: 18, marginTop: 15, color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6B7280", marginTop: 8 },
});

export default NotificationsPage;
