import React, { useEffect, useState, useCallback, useRef } from "react";
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
};

const HomePage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { families, loading: familyLoading } = useSelector(
    (state: RootState) => state.family
  );
  const { user, loading: userLoading } = useSelector(
    (state: RootState) => state.user
  );

  // Local State
  const [localSearch, setLocalSearch] = useState(""); // Filter existing list
  const [inviteCode, setInviteCode] = useState(""); // Search for new family
  const [isSearchingCode, setIsSearchingCode] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(getFamilies());
    dispatch(fetchUserProfile());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(getFamilies());
    dispatch(fetchUserProfile());
  }, [dispatch]);

  /**
   * Hits the /families/invite/:code endpoint via Redux Thunk
   */
  const handleJoinByCode = async () => {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) return;

    setIsSearchingCode(true);
    try {
      const result = await dispatch(
        getFamilyByInviteCode(trimmedCode)
      ).unwrap();

      console.warn(result, "resultresult");
      // If successful, navigate to the Join Family screen with the data
      router.push(`/(routers)/family/${result?.family._id}`);
      setInviteCode(""); // Clear on success
    } catch (err: any) {
      Alert.alert(
        "Family Not Found",
        err || "Please check the code and try again."
      );
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
              {user?.firstName || "Member"}
            </AppText>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <Bell size={24} color={COLORS.black} />
            <View style={styles.notificationDot} />
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
          {/* 1. SEARCH BY INVITE CODE (Global Search) */}
          <AppText type="bold" style={styles.sectionTitle}>
            Join with Invite Code
          </AppText>
          <View style={styles.inviteSearchContainer}>
            <Hash size={18} color={COLORS.icon} />
            <TextInput
              placeholder="Enter code (e.g. 4KXH4N85)"
              style={styles.searchInput}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholderTextColor={COLORS.icon}
              autoCapitalize="characters"
              maxLength={12}
              editable={!isSearchingCode}
            />
            <TouchableOpacity
              style={[
                styles.goButton,
                (!inviteCode || isSearchingCode) && styles.disabledBtn,
              ]}
              onPress={handleJoinByCode}
              disabled={!inviteCode || isSearchingCode}
            >
              {isSearchingCode ? (
                <ActivityIndicator size="small" color={COLORS.black} />
              ) : (
                <ArrowRight size={20} color={COLORS.black} />
              )}
            </TouchableOpacity>
          </View>

          {/* 2. CREATE BUTTON */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/(routers)/family/CreateFamily")}
          >
            <View style={styles.plusCircle}>
              <Plus size={18} color={COLORS.black} strokeWidth={3} />
            </View>
            <AppText type="bold" style={styles.createBtnText}>
              Create New Family
            </AppText>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 3. LIST FILTER & FAMILY LIST */}
          <View style={styles.listHeader}>
            <AppText type="bold" style={styles.sectionTitle}>
              Your Families
            </AppText>
            <View style={styles.filterBox}>
              <Search size={14} color={COLORS.icon} />
              <TextInput
                placeholder="Filter list..."
                style={styles.filterInput}
                value={localSearch}
                onChangeText={setLocalSearch}
                placeholderTextColor={COLORS.icon}
              />
            </View>
          </View>

          {filteredFamilies.length === 0 && !familyLoading && (
            <View style={styles.emptyCenter}>
              <Users size={40} color={COLORS.textLight} opacity={0.5} />
              <AppText style={styles.emptyText}>
                No families matched your search
              </AppText>
            </View>
          )}

          {filteredFamilies.map((item, index) => {
            const accentColor = cardAccents[index % cardAccents.length];
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
                    <AppText type="bold" style={styles.familyName}>
                      {item.familyName}
                    </AppText>
                    <ChevronRight size={20} color={COLORS.icon} />
                  </View>
                  <AppText style={styles.inviteLabel}>
                    Code: {item.inviteCode || item.invitationCode}
                  </AppText>
                  <View style={styles.memberRow}>
                    <Users size={14} color={COLORS.textLight} />
                    <AppText style={styles.memberCount}>
                      {item.members?.length || 1} members
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
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  notificationDot: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, color: COLORS.text, marginBottom: 12 },

  // Invite Search Box
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
  disabledBtn: { opacity: 0.5 },

  // Create Button
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

  // Filter List Styles
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

  // Card Styles
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

  emptyCenter: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: COLORS.textLight, marginTop: 8, fontSize: 14 },
});

export default HomePage;
