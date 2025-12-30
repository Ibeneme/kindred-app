import React, { useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
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
  Heart, // Added for Donations
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

const NotificationsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
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

  const handleNotificationPress = (notification: any) => {
    // 1. Mark as read
    if (!notification.isRead) {
      dispatch(markAsRead(notification._id));
    }

    const familyId = notification.familyId;

    // 2. Donation Specific Routing
    // Passing familyId and a generic familyName if your route requires it
    if (["DONATION_CREATED", "DONATION_UPDATED"].includes(notification.type)) {
      return router.push({
        pathname: "/family/donations",
        params: { familyId: familyId, familyName: "Family" },
      });
    }

    // 3. Logic: If type is member related or deleted donation, go to dashboard
    const goToDashboard =
      notification.type === "MEMBER_JOINED" ||
      notification.type === "INVITATION_RECEIVED" ||
      notification.type === "DONATION_DELETED" ||
      notification.title?.toLowerCase().includes("family members");

    if (goToDashboard) {
      return router.push({
        pathname: "/family/[id]",
        params: { id: familyId },
      });
    }

    // 4. Other specific route matching
    switch (notification.type) {
      case "NEW_SUGGESTION":
        router.push({ pathname: "/family/suggestions", params: { familyId } });
        break;
      case "NEW_TASK":
        router.push({ pathname: "/family/tasks", params: { familyId } });
        break;
      case "POLL_CREATED":
        router.push({ pathname: "/family/polls", params: { familyId } });
        break;
      case "REPORT_SUBMITTED":
        router.push({ pathname: "/family/reports", params: { familyId } });
        break;
      case "NEWS_UPDATE":
        router.push({ pathname: "/family/news", params: { familyId } });
        break;
      default:
        router.push({ pathname: "/family/[id]", params: { id: familyId } });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "DONATION_CREATED":
      case "DONATION_UPDATED":
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
        return <FileText size={20} color="#EF4444" />;
      case "NEWS_UPDATE":
        return <Newspaper size={20} color="#10B981" />;
      case "MEMBER_JOINED":
        return <UserPlus size={20} color="#10B981" />;
      default:
        return <Bell size={20} color="#6B7280" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "DONATION_CREATED":
        return "New Fundraiser";
      case "DONATION_UPDATED":
        return "Fund Updated";
      case "DONATION_DELETED":
        return "Fund Closed";
      case "MEMBER_JOINED":
        return "New Member";
      case "NEW_SUGGESTION":
        return "New Suggestion";
      case "REPORT_SUBMITTED":
        return "Report Update";
      case "NEWS_UPDATE":
        return "Family News";
      default:
        return "Update";
    }
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

      <FlatList
        data={notifications}
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
                Empty Inbox
              </AppText>
              <AppText style={styles.emptySubtitle}>
                No notifications yet.
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 24, color: "#111827" },
  unreadSub: {
    fontSize: 13,
    color: "#EAB308",
    marginTop: 2,
    fontWeight: "600",
  },
  markAllBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 12 },
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
