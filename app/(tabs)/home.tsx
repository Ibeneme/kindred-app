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
const GRID_SPACING = 16;
const COLUMN_WIDTH = (width - 48 - GRID_SPACING) / 2;

const COLORS = {
  primary: "#FFE66D",
  black: "#000000",
  background: "#FFFFFF",
  surface: "#F8FAFC",
  border: "#E2E8F0",
  textGrey: "#64748B",
  unread: "#EF4444",
};

// 🎨 VIBRANT FAMILY PALETTE
const FAMILY_COLORS = [
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#F97316", // Orange
  "#3B82F6", // Blue
  "#10B981", // Green
];

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
        duration: 800,
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
        <View style={styles.header}>
          <View>
            <AppText style={styles.brandTag} type="bold">
              KINDRED
            </AppText>
            <View style={styles.userGreet}>
              <AppText type="bold" style={styles.userName}>
                {user?.firstName || "Hello"}
              </AppText>
              <Crown size={18} color={COLORS.black} style={{ marginLeft: 6 }} />
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsGridView(!isGridView)}
            >
              {isGridView ? (
                <List size={22} color={COLORS.black} />
              ) : (
                <LayoutGrid size={22} color={COLORS.black} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, styles.notifBtn]}
              onPress={() => router.push("/(tabs)/notifications")}
            >
              <Bell size={22} color={COLORS.black} />
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
          <View style={styles.quoteBox}>
            <Sparkles size={16} color={COLORS.black} />
            <AppText style={styles.quoteText} type="medium">
              {currentQuote.toUpperCase()}
            </AppText>
          </View>

          <View style={styles.searchSection}>
            <View style={styles.searchLabelRow}>
              <ShieldCheck size={14} color={COLORS.black} />
              <AppText type="bold" style={styles.searchLabel}>
                JOIN BY INVITE CODE
              </AppText>
            </View>
            <View style={styles.inviteInputRow}>
              <Hash size={20} color={COLORS.textGrey} />
              <TextInput
                placeholder="INVITE CODE"
                style={styles.inviteInput}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholderTextColor={COLORS.textGrey}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.inviteGoBtn}
                onPress={handleJoinByCode}
              >
                {isSearchingCode ? (
                  <ActivityIndicator size="small" color={COLORS.black} />
                ) : (
                  <ArrowRight size={22} color={COLORS.black} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.createFamilyBtn}
            onPress={() => router.push("/(routers)/family/CreateFamily")}
            activeOpacity={0.8}
          >
            <View style={styles.createIconBox}>
              <Plus size={24} color={COLORS.black} />
            </View>
            <AppText type="bold" style={styles.createBtnText}>
              START A NEW FAMILY CIRCLE
            </AppText>
            <Fingerprint size={20} color={COLORS.black} />
          </TouchableOpacity>

          <View style={styles.listHeader}>
            <AppText type="bold" style={styles.listTitle}>
              YOUR FAMILY CIRCLES
            </AppText>
            <View style={styles.filterBox}>
              <Search size={14} color={COLORS.textGrey} />
              <TextInput
                placeholder="FILTER"
                style={styles.filterText}
                value={localSearch}
                onChangeText={setLocalSearch}
              />
            </View>
          </View>

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
                  activeOpacity={0.7}
                >
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.colorIndicator,
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

                    <View style={styles.cardBottom}>
                      <View style={styles.meta}>
                        <Users size={12} color={familyColor} />
                        <AppText style={styles.metaValue}>
                          {item.members?.length || 0}
                        </AppText>
                      </View>
                      <AppText
                        style={[styles.typeText, { color: familyColor }]}
                        numberOfLines={1}
                      >
                        • {item.familyType}
                      </AppText>
                    </View>
                  </View>
                  {!isGridView && (
                    <ChevronRight size={22} color={COLORS.border} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderContainer: {
    alignItems: "center",
    backgroundColor: COLORS.black,
    padding: 30,
    borderRadius: 20,
  },
  loaderText: {
    color: COLORS.primary,
    marginTop: 15,
    fontSize: 10,
    letterSpacing: 2,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTag: { fontSize: 10, color: COLORS.black, letterSpacing: 4 },
  userGreet: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  userName: { fontSize: 24, color: COLORS.black },
  headerActions: { flexDirection: "row", gap: 12 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifBtn: { position: "relative" },
  notifBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.unread,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    gap: 10,
  },
  quoteText: { fontSize: 10, color: COLORS.black, flex: 1, letterSpacing: 1 },
  searchSection: { marginBottom: 25 },
  searchLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  searchLabel: { fontSize: 10, color: COLORS.black, letterSpacing: 2 },
  inviteInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inviteInput: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.black,
    letterSpacing: 1,
  },
  inviteGoBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 12,
    margin: 4,
  },
  createFamilyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.black,
    padding: 18,
    borderRadius: 16,
    marginBottom: 35,
    justifyContent: "space-between",
  },
  createIconBox: {
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 10,
  },
  createBtnText: { color: COLORS.primary, fontSize: 14, letterSpacing: 1 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  listTitle: { fontSize: 12, color: COLORS.black, letterSpacing: 2 },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    borderRadius: 10,
    width: "45%",
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { flex: 1, fontSize: 11, marginLeft: 6 },
  listContainer: { gap: 12 },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: GRID_SPACING },
  gridCard: {
    width: COLUMN_WIDTH,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 130,
    justifyContent: "space-between",
  },
  cardInfo: { flex: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  colorIndicator: { width: 12, height: 12, borderRadius: 4, marginRight: 8 },
  cardName: { fontSize: 15, color: COLORS.black, flex: 1 },
  unreadBadge: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 6,
    justifyContent: "center",
  },
  unreadText: { color: COLORS.primary, fontSize: 9 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaValue: { fontSize: 12, color: COLORS.black, fontWeight: "bold" },
  typeText: { fontSize: 11, fontWeight: "bold" },
});

export default HomePage;
