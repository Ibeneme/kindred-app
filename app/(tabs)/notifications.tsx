import React, {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
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

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    NEW_SUGGESTION: "Suggestion",
    NEW_TASK: "Task",
    NEW_DONATION: "Fundraiser",
    DONATION_CREATED: "Fundraiser",
    DONATION_UPDATED: "Fund Update",
    DONATION_DELETED: "Fund Closed",
    MEMBER_JOINED: "New Member",
    FAMILY_INVITE: "Family Invite",
    POLL_CREATED: "New Poll",
    REPORT_SUBMITTED: "Report",
    NEWS_UPDATE: "Family News",
    FAMILY_JOIN_REQUEST: "Join Request",
  };
  return labels[type] || "Update";
};

const getNotificationIcon = (type: string) => {
  const iconProps = { size: 18, strokeWidth: 2.5 };
  switch (type) {
    case "DONATION_CREATED":
    case "NEW_DONATION":
      return <Heart {...iconProps} color="#EF4444" />;
    case "NEW_SUGGESTION":
      return <Lightbulb {...iconProps} color="#EAB308" />;
    case "NEW_TASK":
      return <ClipboardList {...iconProps} color="#3B82F6" />;
    case "POLL_CREATED":
      return <BarChart3 {...iconProps} color="#8B5CF6" />;
    case "NEWS_UPDATE":
      return <Newspaper {...iconProps} color="#10B981" />;
    default:
      return <Bell {...iconProps} color="#6366F1" />;
  }
};

// ─────────────────────────────────────────────
// Shimmer components
// ─────────────────────────────────────────────
const ShimmerBlock = ({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E2E8F0",
          borderRadius: 8,
          opacity: anim,
        },
        style,
      ]}
    />
  );
};

const NotificationShimmer = () => (
  <View style={styles.notifCard}>
    <ShimmerBlock
      width={44}
      height={44}
      style={{ borderRadius: 12, marginRight: 16 }}
    />
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <ShimmerBlock width={70} height={12} />
        <ShimmerBlock width={50} height={12} />
      </View>
      <ShimmerBlock width="80%" height={16} style={{ marginBottom: 8 }} />
      <ShimmerBlock width="95%" height={14} style={{ marginBottom: 4 }} />
      <ShimmerBlock width="60%" height={14} />
    </View>
  </View>
);

const ShimmerList = () => (
  <View style={styles.list}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <NotificationShimmer key={i} />
    ))}
  </View>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const NotificationsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { notifications, loading, unreadCount } = useSelector(
    (state: RootState) => state.notifications
  );

  useEffect(() => {
    dispatch(fetchNotifications());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchNotifications());
    setRefreshing(false);
  }, [dispatch]);

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n: any) =>
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const handleNotificationPress = (notification: any) => {
    if (!notification.isRead) dispatch(markAsRead(notification._id));
    router.push({
      pathname: "/family/[id]",
      params: { id: notification.familyId },
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.notifCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconWrapper}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: item.isRead ? "#F3F4F6" : "#FEF9C3" },
          ]}
        >
          {getNotificationIcon(item.type)}
        </View>
        {!item.isRead && <View style={styles.unreadPulse} />}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.labelRow}>
          <AppText style={styles.typeLabel}>{getTypeLabel(item.type)}</AppText>
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

  // Show shimmer only on initial load (not on pull-to-refresh)
  const showShimmer = loading && !refreshing && notifications.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <AppText type="bold" style={styles.headerTitle}>
            Notifications
          </AppText>
          <AppText style={styles.unreadSub}>
            {unreadCount} unread notifications
          </AppText>
        </View>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={() => dispatch(markAllAsRead())}
        >
          <CheckCheck size={20} color="#EAB308" />
          <AppText style={styles.markAllText}>Read All</AppText>
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search notifications..."
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showShimmer ? (
        <ShimmerList />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EAB308"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={40} color="#CBD5E1" />
              </View>
              <AppText type="bold" style={styles.emptyTitle}>
                Nothing here yet
              </AppText>
              <AppText style={styles.emptySubtitle}>
                We'll notify you when something happens.
              </AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#F8FAFC",
  },
  headerTitle: { fontSize: 28, color: "#0F172A", letterSpacing: -0.5 },
  unreadSub: { fontSize: 14, color: "#64748B", marginTop: 4 },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  markAllText: {
    fontSize: 13,
    color: "#EAB308",
    marginLeft: 6,
    fontWeight: "600",
  },
  searchContainer: { paddingHorizontal: 24, marginBottom: 15 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: { flex: 1, marginLeft: 10, color: "#1E293B", fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  notifCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  unreadCard: {
    borderColor: "#FEF9C3",
    backgroundColor: "#FFFEF5",
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrapper: { position: "relative" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  unreadPulse: {
    position: "absolute",
    top: -2,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EAB308",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  contentContainer: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeLabel: { fontSize: 11, color: "#94A3B8" },
  notifTitle: { fontSize: 16, color: "#1E293B", marginBottom: 4 },
  notifMessage: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, color: "#334155" },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

export default NotificationsPage;
