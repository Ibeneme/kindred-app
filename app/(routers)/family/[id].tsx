import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Clipboard,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronLeft,
  Users,
  Calendar,
  UserPlus,
  Copy,
  FileText,
  Sparkles,
  BarChart3,
  Check,
  X,
  Clock,
  Heart,
} from "lucide-react-native";

import { AppText } from "@/src/ui/AppText";
import {
  getFamilyById,
  requestToJoin,
  getJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
  acceptInvite,
  declineInvite,
} from "@/src/redux/slices/familySlice";
import { AppDispatch, RootState } from "@/src/redux/store";
import { useGlobalSpinner } from "@/src/hooks/useGlobalSpinner";

const { width } = Dimensions.get("window");
const GRID_SIZE = (width - 60) / 2;

// --- REUSABLE COMPONENTS ---

const SidebarItem = ({ icon, label, onPress, badge }: any) => (
  <TouchableOpacity style={styles.sidebarItem} onPress={onPress}>
    <View style={styles.iconWrapper}>
      {icon}
      {badge > 0 && (
        <View style={styles.sidebarBadge}>
          <AppText style={styles.badgeText}>{badge}</AppText>
        </View>
      )}
    </View>
    <AppText style={styles.sidebarItemLabel}>{label}</AppText>
  </TouchableOpacity>
);

const NavCard = ({ title, subtitle, icon, color, badge, onPress }: any) => (
  <TouchableOpacity style={styles.navCard} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
      {icon}
      {badge > 0 && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{badge}</AppText>
        </View>
      )}
    </View>
    <AppText type="bold" style={{ fontSize: 15 }}>
      {title}
    </AppText>
    <AppText style={{ fontSize: 12, color: "#6B7280" }}>{subtitle}</AppText>
  </TouchableOpacity>
);

// --- MAIN PAGE ---

const FamilyDetailPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.user);

  const [familyData, setFamilyData] = useState<{
    family: any;
    isOwner: boolean;
  } | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useGlobalSpinner(loading);

  // --- LOGIC: FIND CURRENT USER'S UNREAD COUNTS ---
  const myUnreads = useMemo(() => {
    if (!familyData?.family?.members || !user?._id) return null;
    // Find the member entry that matches the logged-in user
    const memberEntry = familyData.family.members.find(
      (m: any) => m._id === user._id
    );
    return memberEntry?.unreadCounts || null;
  }, [familyData, user]);

  const fetchInitialData = async (isSilentRefresh = false) => {
    if (!id) return;
    try {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response: any = await dispatch(
        getFamilyById(id as string)
      ).unwrap();
      setFamilyData(response);

      if (response.isOwner) {
        const requests = await dispatch(getJoinRequests(id as string)).unwrap();
        setJoinRequests(requests);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchInitialData(true);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchInitialData(!!familyData);
    }, [id])
  );

  const handleJoinRequest = async () => {
    try {
      setLoading(true);
      await dispatch(requestToJoin(id as string)).unwrap();
      Alert.alert("Success", "Join request sent to the owner.");
      await fetchInitialData();
    } catch (err: any) {
      Alert.alert("Error", err);
      setLoading(false);
    }
  };

  const handleInviteResponse = async (action: "accept" | "decline") => {
    try {
      setLoading(true);
      if (action === "accept") {
        await dispatch(acceptInvite(id as string)).unwrap();
        Alert.alert("Welcome!", "You are now a member.");
      } else {
        await dispatch(declineInvite(id as string)).unwrap();
      }
      await fetchInitialData();
    } catch (err: any) {
      Alert.alert("Error", err);
      setLoading(false);
    }
  };

  const handleOwnerAction = async (
    userId: string,
    action: "accept" | "decline"
  ) => {
    try {
      setLoading(true);
      if (action === "accept") {
        await dispatch(
          acceptJoinRequest({ familyId: id as string, userId })
        ).unwrap();
      } else {
        await dispatch(
          declineJoinRequest({ familyId: id as string, userId })
        ).unwrap();
      }
      await fetchInitialData();
    } catch (err: any) {
      Alert.alert("Error", "Action failed");
      setLoading(false);
    }
  };

  if (!familyData || !user) return null;

  const { family, isOwner } = familyData;
  const isMember = family.isMember || isOwner;
  const hasRequested = family.isJoinRequestSent;
  const isInvited = family.isInviteSent;

  console.warn(myUnreads, 'myUnreads')
  const features = [
    {
      label: "Invite",
      icon: <UserPlus size={20} color="#EAB308" />,
      onPress: () =>
        router.push({
          pathname: "/family/invite",
          params: {
            familyId: family._id,
            currentMembers: JSON.stringify(family.members),
            isOwner: String(isOwner),
          },
        }),
    },
    {
      label: "News",
      icon: <FileText size={20} color="#EAB308" />,
      badge: myUnreads?.news,
      onPress: () =>
        router.push({
          pathname: "/family/news",
          params: { familyId: family._id, isOwner: String(isOwner) },
        }),
    },
    {
      label: "Tasks",
      icon: <Calendar size={20} color="#10B981" />,
      badge: myUnreads?.tasks,
      onPress: () =>
        router.push({
          pathname: "/family/tasks",
          params: { familyId: family._id, isOwner: String(isOwner) },
        }),
    },
    {
      label: "Polls",
      icon: <BarChart3 size={20} color="#6366F1" />,
      badge: myUnreads?.polls,
      onPress: () =>
        router.push({
          pathname: "/family/polls",
          params: { familyId: family._id, isOwner: String(isOwner) },
        }),
    },
    {
      label: "Suggestions",
      icon: <Sparkles size={20} color="#F59E0B" />,
      badge: myUnreads?.suggestions,
      onPress: () =>
        router.push({
          pathname: "/family/suggestions",
          params: { familyId: family._id, isOwner: String(isOwner) },
        }),
    },
    {
      label: "Reports",
      icon: <BarChart3 size={20} color="#6B7280" />,
      badge: myUnreads?.reports,
      onPress: () =>
        router.push({
          pathname: "/family/reports",
          params: { familyId: family._id, isOwner: String(isOwner) },
        }),
    },
    {
      label: "Donations",
      icon: <Heart size={20} color="#EF4444" />,
      onPress: () =>
        router.push({
          pathname: "/family/donations",
          params: {
            familyId: family._id,
            familyName: family.familyName,
            isOwner: String(isOwner),
          },
        }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentArea}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EAB308"]}
            tintColor="#EAB308"
          />
        }
      >
        <View style={{ paddingHorizontal: 16 }}>
          <AppText type="bold" style={{ fontSize: 24 }}>
            {family.familyName}
          </AppText>
          <AppText type="medium" style={{ fontSize: 14, color: "gray" }}>
            {family.familyType}
          </AppText>
        </View>

        {!isMember ? (
          <View style={styles.statusCard}>
            {isInvited ? (
              <>
                <Sparkles
                  size={40}
                  color="#EAB308"
                  style={{ marginBottom: 12 }}
                />
                <AppText type="bold" style={styles.statusTitle}>
                  You're Invited!
                </AppText>
                <AppText style={styles.statusSub}>
                  The owner has invited you to join this circle.
                </AppText>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleInviteResponse("accept")}
                  >
                    <AppText type="bold" style={{ color: "#FFF" }}>
                      Accept Invite
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => handleInviteResponse("decline")}
                  >
                    <AppText type="bold" style={{ color: "#EF4444" }}>
                      Decline
                    </AppText>
                  </TouchableOpacity>
                </View>
              </>
            ) : hasRequested ? (
              <>
                <Clock size={40} color="#6B7280" style={{ marginBottom: 12 }} />
                <AppText type="bold" style={styles.statusTitle}>
                  Request Sent
                </AppText>
                <AppText style={styles.statusSub}>
                  Waiting for owner approval.
                </AppText>
                <View style={styles.disabledBtn}>
                  <AppText type="bold" style={{ color: "#9CA3AF" }}>
                    Pending Approval...
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <Users size={40} color="#EAB308" style={{ marginBottom: 12 }} />
                <AppText type="bold" style={styles.statusTitle}>
                  Join Family
                </AppText>
                <AppText style={styles.statusSub}>
                  Request access to collaborate.
                </AppText>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleJoinRequest}
                >
                  <AppText type="bold">Request to Join</AppText>
                  <UserPlus size={20} color="#000" />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <NavCard
                title="Members"
                subtitle={`${family.members?.length || 0} people`}
                icon={<Users size={24} color="#3B82F6" />}
                color="#3B82F6"
                onPress={() =>
                  router.push({
                    pathname: "/family/members",
                    params: {
                      members: JSON.stringify(family.members),
                      familyName: family.familyName,
                    },
                  })
                }
              />
              <NavCard
                title="Tasks"
                subtitle="Ongoing"
                icon={<Calendar size={24} color="#10B981" />}
                color="#10B981"
                badge={myUnreads?.tasks}
                onPress={() =>
                  router.push({
                    pathname: "/family/tasks",
                    params: { familyId: family._id },
                  })
                }
              />
            </View>

            <AppText type="bold" style={styles.sectionHeading}>
              Features
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featureList}
            >
              {features.map((f, i) => (
                <SidebarItem key={i} {...f} badge={f.badge} />
              ))}
            </ScrollView>

            {isOwner && joinRequests.length > 0 && (
              <View style={styles.requestSection}>
                <AppText type="bold" style={styles.sectionHeading}>
                  Join Requests
                </AppText>
                {joinRequests.map((req) => (
                  <View key={req._id} style={styles.reqItem}>
                    <View style={{ flex: 1 }}>
                      <AppText type="bold">
                        {req.firstName} {req.lastName}
                      </AppText>
                      <AppText style={{ fontSize: 12, color: "#6B7280" }}>
                        {req.email}
                      </AppText>
                    </View>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={styles.iconBtnGreen}
                        onPress={() => handleOwnerAction(req._id, "accept")}
                      >
                        <Check size={18} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtnRed}
                        onPress={() => handleOwnerAction(req._id, "decline")}
                      >
                        <X size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.inviteBox}>
              <AppText type="bold">Invite Code</AppText>
              <TouchableOpacity
                style={styles.codeRow}
                onPress={() => {
                  Clipboard.setString(family.inviteCode);
                  Alert.alert("Copied!");
                }}
              >
                <AppText type="bold" style={styles.codeText}>
                  {family.inviteCode}
                </AppText>
                <Copy size={20} color="#EAB308" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF7" },
  header: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backBtn: { flexDirection: "row", alignItems: "center" },
  contentArea: { flex: 1 },
  statusCard: {
    margin: 20,
    padding: 30,
    backgroundColor: "#FFF",
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusTitle: { fontSize: 20, marginBottom: 8 },
  statusSub: { textAlign: "center", color: "#6B7280", marginBottom: 20 },
  buttonGroup: { width: "100%", gap: 10 },
  acceptBtn: {
    backgroundColor: "#10B981",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  declineBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#EAB308",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  disabledBtn: {
    backgroundColor: "#F3F4F6",
    padding: 15,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
    gap: 15,
  },
  navCard: {
    width: GRID_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrapper: { position: "relative" },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  sidebarBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  sectionHeading: {
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 10,
  },
  featureList: { paddingHorizontal: 20, gap: 15, paddingBottom: 10 },
  sidebarItem: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: 100,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sidebarItemLabel: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 6,
    textAlign: "center",
  },
  requestSection: { paddingHorizontal: 20, marginTop: 20 },
  reqItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  row: { flexDirection: "row", gap: 10 },
  iconBtnGreen: { backgroundColor: "#10B981", padding: 8, borderRadius: 10 },
  iconBtnRed: { backgroundColor: "#EF4444", padding: 8, borderRadius: 10 },
  inviteBox: {
    margin: 20,
    padding: 20,
    backgroundColor: "#FEFCE8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  codeRow: { flexDirection: "row", justifyContent: "space-between" },
  codeText: { fontSize: 24, color: "#EAB308", letterSpacing: 5 },
});

export default FamilyDetailPage;
