import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import {
  Plus,
  Search,
  Users,
  ChevronRight,
  Bell,
  Sparkles,
  Hash,
  ArrowRight,
  LayoutGrid,
  List,
  Crown,
  ShieldCheck,
  Fingerprint,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import {
  getFamilies,
  getFamilyByInviteCode,
} from "@/src/redux/slices/familySlice";
import { fetchUserProfile } from "@/src/redux/slices/userSlice";
import { AppDispatch, RootState } from "@/src/redux/store";
import { fetchNotifications } from "@/src/redux/slices/notificationSlice";

const { width } = Dimensions.get("window");
const GRID_SPACING = 14;
const COLUMN_WIDTH = (width - 48 - GRID_SPACING) / 2;

const COLORS = {
  primary: "#FFE66D",
  black: "#111827",
  background: "#FFFFFF",
  surface: "#F8FAFC",
  border: "#E2E8F0",
  textGrey: "#64748B",
  unread: "#EF4444",
  muted: "#94A3B8",
};

const FAMILY_COLORS = ["#A855F7", "#EC4899", "#F97316", "#3B82F6", "#10B981"];

const LoadingModal = ({ visible }: { visible: boolean }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <AppText type="bold" style={styles.loaderText}>
          SYNCING SANCTUARY...
        </AppText>
      </View>
    </View>
  </Modal>
);

const HomePage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { families } = useSelector((state: RootState) => state.family);
  const { user } = useSelector((state: RootState) => state.user);
  const { unreadCount: globalNotificationsCount } = useSelector(
    (state: RootState) => state.notifications
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [isGridView, setIsGridView] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const syncData = async (showModal = true) => {
    if (showModal) setIsSyncing(true);
    try {
      await Promise.all([
        dispatch(getFamilies()),
        dispatch(fetchUserProfile()),
        dispatch(fetchNotifications()),
      ]);
    } finally {
      setIsSyncing(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      syncData();
      setCurrentQuote("Your heritage preservation starts here.");
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    syncData(false);
  };

  const handleJoinByCode = async () => {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) return;
    setIsSearchingCode(true);
    try {
      const result = await dispatch(
        getFamilyByInviteCode(trimmedCode)
      ).unwrap();
      router.push(`/(routers)/family/${result?.family._id}`);
      setInviteCode("");
    } catch (err: any) {
      Alert.alert("Invalid Entry", "The invite code provided is incorrect.");
    } finally {
      setIsSearchingCode(false);
    }
  };

  const filteredFamilies = families.filter((f) =>
    f.familyName?.toLowerCase().includes(localSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <LoadingModal visible={isSyncing && !families.length} />

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <AppText style={styles.brandTag} type="bold">
              Kokohor
            </AppText>
            <View style={styles.userGreet}>
              <AppText type="bold" style={styles.userName}>
                {user?.firstName || "Hello"}
              </AppText>
              <Crown size={16} color={COLORS.black} style={{ marginLeft: 6 }} />
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsGridView(!isGridView)}
              activeOpacity={0.7}
            >
              {isGridView ? (
                <List size={20} color={COLORS.black} />
              ) : (
                <LayoutGrid size={20} color={COLORS.black} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, styles.notifBtn]}
              onPress={() => router.push("/(tabs)/notifications")}
              activeOpacity={0.7}
            >
              <Bell size={20} color={COLORS.black} />
              {globalNotificationsCount > 0 && (
                <View style={styles.notifBadge} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.black}
            />
          }
        >
          {/* ── Quote ── */}
          <View style={styles.quoteBox}>
            <View style={styles.quoteIcon}>
              <Sparkles size={14} color={COLORS.black} />
            </View>
            <AppText style={styles.quoteText} type="medium">
              {currentQuote}
            </AppText>
          </View>

          {/* ── Join by Invite ── */}
          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <ShieldCheck size={14} color={COLORS.black} />
              <AppText type="bold" style={styles.sectionLabel}>
                Join by Invite Code
              </AppText>
            </View>

            <View style={styles.inviteRow}>
              <View style={styles.inviteInputWrap}>
                <Hash size={18} color={COLORS.muted} />
                <TextInput
                  placeholder="Enter invite code"
                  style={styles.inviteInput}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholderTextColor={COLORS.muted}
                  autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity
                style={styles.inviteGoBtn}
                onPress={handleJoinByCode}
                activeOpacity={0.85}
              >
                {isSearchingCode ? (
                  <ActivityIndicator size="small" color={COLORS.black} />
                ) : (
                  <ArrowRight size={20} color={COLORS.black} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Create Family ── */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/(routers)/family/CreateFamily")}
            activeOpacity={0.85}
          >
            <View style={styles.createLeft}>
              <View style={styles.createIconBox}>
                <Plus size={20} color={COLORS.black} />
              </View>
              <AppText type="bold" style={styles.createBtnText}>
                Start a New Family Circle
              </AppText>
            </View>
            <Fingerprint size={18} color={COLORS.primary} />
          </TouchableOpacity>

          {/* ── List Header ── */}
          <View style={styles.listHeader}>
            <AppText type="bold" style={styles.listTitle}>
              Your Family Circles
            </AppText>
            <View style={styles.filterBox}>
              <Search size={14} color={COLORS.muted} />
              <TextInput
                placeholder="Filter"
                style={styles.filterInput}
                value={localSearch}
                onChangeText={setLocalSearch}
                placeholderTextColor={COLORS.muted}
              />
            </View>
          </View>

          {/* ── Family Cards ── */}
          <View
            style={isGridView ? styles.gridContainer : styles.listContainer}
          >
            {filteredFamilies.map((item, index) => {
              const totalUnread = Object.values(
                item.unreadSummary || {}
              ).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
              const familyColor = FAMILY_COLORS[index % FAMILY_COLORS.length];

              return (
                <TouchableOpacity
                  key={item._id}
                  style={isGridView ? styles.gridCard : styles.listCard}
                  onPress={() => router.push(`/(routers)/family/${item._id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: familyColor },
                        ]}
                      />
                      <AppText
                        type="bold"
                        style={styles.cardName}
                        numberOfLines={1}
                      >
                        {item.familyName}
                      </AppText>
                      {totalUnread > 0 && (
                        <View style={styles.unreadBadge}>
                          <AppText type="bold" style={styles.unreadText}>
                            {totalUnread}
                          </AppText>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Users size={13} color={familyColor} />
                        <AppText style={styles.metaText}>
                          {item.members?.length || 0}
                        </AppText>
                      </View>
                      <AppText
                        style={[styles.typeText, { color: familyColor }]}
                        numberOfLines={1}
                      >
                        {item.familyType}
                      </AppText>
                    </View>
                  </View>

                  {!isGridView && (
                    <ChevronRight size={20} color={COLORS.border} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredFamilies.length === 0 && (
            <View style={styles.emptyState}>
              <Users size={32} color={COLORS.muted} />
              <AppText style={styles.emptyText}>No family circles yet</AppText>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderContainer: {
    alignItems: "center",
    backgroundColor: COLORS.black,
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: 20,
  },
  loaderText: {
    color: COLORS.primary,
    marginTop: 14,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTag: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  userGreet: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  userName: {
    fontSize: 26,
    color: COLORS.black,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifBtn: {
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.unread,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  // Quote
  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 28,
    gap: 12,
  },
  quoteIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  quoteText: {
    fontSize: 13,
    color: COLORS.black,
    flex: 1,
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.black,
    letterSpacing: 0.3,
  },

  // Invite
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inviteInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
  },
  inviteInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.black,
  },
  inviteGoBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Create Button
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.black,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 32,
  },
  createLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  createIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  // List Header
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  listTitle: {
    fontSize: 13,
    color: COLORS.black,
  },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 120,
  },
  filterInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 6,
    color: COLORS.black,
    paddingVertical: 0,
  },

  // Cards
  listContainer: {
    gap: 12,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_SPACING,
  },
  gridCard: {
    width: COLUMN_WIDTH,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 120,
  },
  cardBody: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  cardName: {
    fontSize: 15,
    color: COLORS.black,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 8,
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadText: {
    color: COLORS.primary,
    fontSize: 10,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: "600",
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
  },
});

export default HomePage;
