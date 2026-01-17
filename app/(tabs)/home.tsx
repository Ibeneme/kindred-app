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
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import {
  getFamilies,
  getFamilyByInviteCode,
} from "@/src/redux/slices/familySlice";
import { fetchUserProfile } from "@/src/redux/slices/userSlice";
import { AppDispatch, RootState } from "@/src/redux/store";
import { useGlobalSpinner } from "@/src/hooks/useGlobalSpinner";
import { fetchNotifications } from "@/src/redux/slices/notificationSlice";

const COLORS = {
  black: "#000000",
  yellow: "#FFE66D",
  primary: "#FF6B6B",
  secondary: "#4ECDC4",
  mint: "#95E1BF",
  background: "#FFFFFF",
  surface: "#F8FAFC",
  text: "#1E293B",
  textLight: "#64748B",
  icon: "#64748B",
  unreadRed: "#EF4444",
};

const motivationalQuotes = [
  "Unity is strength",
  "Family is everything",
  "Together we are stronger",
  "In unity, we find strength",
];

const HomePage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { families, loading: familyLoading } = useSelector(
    (state: RootState) => state.family
  );
  const { user, loading: userLoading } = useSelector(
    (state: RootState) => state.user
  );
  const { loading, unreadCount: globalNotificationsCount } = useSelector(
    (state: RootState) => state.notifications
  );

  useGlobalSpinner(loading || userLoading);

  const [localSearch, setLocalSearch] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const getRandomQuote = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setCurrentQuote(motivationalQuotes[randomIndex]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(getFamilies());
      dispatch(fetchUserProfile());
      dispatch(fetchNotifications());
      getRandomQuote();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, [dispatch, getRandomQuote])
  );

  const onRefresh = useCallback(() => {
    dispatch(getFamilies());
    dispatch(fetchUserProfile());
    dispatch(fetchNotifications());
    getRandomQuote();
  }, [dispatch, getRandomQuote]);

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
      Alert.alert("Family Not Found", err || "Check the code and try again.");
    } finally {
      setIsSearchingCode(false);
    }
  };

  const filteredFamilies = families.filter((f) =>
    f.familyName?.toLowerCase().includes(localSearch.toLowerCase())
  );

  const cardAccents = [COLORS.primary, COLORS.secondary, COLORS.mint];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <AppText type="bold" style={styles.welcomeText}>
              Good day,
            </AppText>
            <AppText type="bold" style={styles.userName}>
              {user?.firstName || "***************"}
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <Bell size={24} color={COLORS.black} />
            {globalNotificationsCount > 0 && (
              <View style={styles.unreadBadge}>
                <AppText style={styles.unreadCountText} type="bold">
                  {globalNotificationsCount > 9
                    ? "9+"
                    : globalNotificationsCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={familyLoading}
              onRefresh={onRefresh}
              colors={[COLORS.yellow]}
            />
          }
        >
          {/* Quote Section */}
          <View style={styles.quoteContainer}>
            <Sparkles
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 8 }}
            />
            <AppText style={styles.quoteText} type="medium">
              "{currentQuote}"
            </AppText>
          </View>

          {/* Join with Invite Code */}
          <AppText type="bold" style={styles.sectionTitle}>
            Join with Invite Code
          </AppText>
          <View className="flex flex-col items-center gap-4">
            <View className="relative">
              <View className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 bg-green-500" />
            </View>
          </View>
          <View style={styles.inviteSearchContainer}>
            <Hash size={18} color={COLORS.icon} />
            <TextInput
              placeholder="Enter code"
              style={styles.searchInput}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholderTextColor={COLORS.icon}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.goButton}
              onPress={handleJoinByCode}
            >
              {isSearchingCode ? (
                <ActivityIndicator size="small" />
              ) : (
                <ArrowRight size={20} color={COLORS.black} />
              )}
            </TouchableOpacity>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/(routers)/family/CreateFamily")}
          >
            <View style={styles.plusCircle}>
              <Plus size={18} color={COLORS.black} />
            </View>
            <AppText type="bold" style={styles.createBtnText}>
              Create New Family
            </AppText>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Your Families List */}
          <View style={styles.listHeader}>
            <AppText type="bold" style={styles.sectionTitle}>
              Your Families
            </AppText>
            <View style={styles.filterBox}>
              <Search size={14} color={COLORS.icon} />
              <TextInput
                placeholder="Filter..."
                style={styles.filterInput}
                value={localSearch}
                onChangeText={setLocalSearch}
                placeholderTextColor={COLORS.icon}
              />
            </View>
          </View>

          {filteredFamilies.map((item, index) => {
            const accentColor = cardAccents[index % cardAccents.length];

            // LOGIC: Sum all unread items from unreadSummary
            const summary = item.unreadSummary || {};
            const totalUnread = Object.values(summary).reduce(
              (acc: number, val: any) => acc + (Number(val) || 0),
              0
            );

            return (
              <TouchableOpacity
                key={item._id}
                style={styles.familyCard}
                onPress={() => router.push(`/(routers)/family/${item._id}`)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.accentBar, { backgroundColor: accentColor }]}
                />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <AppText type="bold" style={styles.familyName}>
                        {item.familyName}
                      </AppText>
                      <AppText style={styles.inviteLabel}>
                        Code: {item.inviteCode}
                      </AppText>
                    </View>

                    {/* RENDER RED BADGE IF totalUnread > 0 */}
                    {totalUnread > 0 && (
                      <View style={styles.familyUnreadBadge}>
                        <AppText style={styles.familyUnreadText} type="bold">
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </AppText>
                      </View>
                    )}

                    <ChevronRight size={20} color={COLORS.icon} />
                  </View>

                  <View style={styles.memberRow}>
                    <Users size={14} color={COLORS.textLight} />
                    <AppText style={styles.memberCount}>
                      {item.members?.length || 0} members
                    </AppText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: { fontSize: 13, color: COLORS.textLight },
  userName: { fontSize: 24, color: COLORS.text, marginTop: 2 },
  notificationBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.unreadRed,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  unreadCountText: { color: "#FFFFFF", fontSize: 10, textAlign: "center" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  quoteContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.yellow,
  },
  quoteText: { fontSize: 14, color: COLORS.text, fontStyle: "italic", flex: 1 },
  sectionTitle: { fontSize: 16, color: COLORS.text, marginBottom: 12 },
  inviteSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
    color: COLORS.text,
    marginLeft: 10,
  },
  goButton: {
    backgroundColor: COLORS.yellow,
    padding: 12,
    borderRadius: 14,
    margin: 4,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.black,
    padding: 14,
    borderRadius: 18,
    gap: 12,
    marginBottom: 24,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.yellow,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: { color: COLORS.yellow, fontSize: 16 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 24 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: "50%",
    height: 36,
  },
  filterInput: { flex: 1, fontSize: 13, color: COLORS.text, marginLeft: 6 },
  familyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  accentBar: { width: 6 },
  cardContent: { flex: 1, padding: 18 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  familyName: { fontSize: 17, color: COLORS.text },
  familyUnreadBadge: {
    backgroundColor: COLORS.unreadRed,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    paddingHorizontal: 6,
    // Add shadow for better "pop"
    shadowColor: COLORS.unreadRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  familyUnreadText: { color: "#FFF", fontSize: 10, textAlign: "center" },
  inviteLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: "italic",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  memberCount: { fontSize: 13, color: COLORS.textLight },
});

export default HomePage;
