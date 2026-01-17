import React, { useState, useCallback } from "react";
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
  Copy,
  FileText,
  Sparkles,
  BarChart3,
  Heart,
  GitGraph,
  History,
  MapPin,
  BookOpen,
  MessageSquare,
  Crown,
  ShieldCheck,
  ClipboardList,
  Info,
  Settings2,
  UserPlus,
  Clock,
  Check,
  X,
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

// ─── REUSABLE COMPONENTS ────────────────────────────────────────────────

const SidebarItem = ({ icon, label, onPress, badge }: any) => (
  <TouchableOpacity style={styles.sidebarItem} onPress={onPress}>
    <View style={styles.iconWrapper}>
      {icon}
      {badge > 0 && (
        <View style={styles.sidebarBadge}>
          <AppText style={styles.badgeText}>
            {badge > 99 ? "99+" : badge}
          </AppText>
        </View>
      )}
    </View>
    <AppText style={styles.sidebarItemLabel} numberOfLines={1}>
      {label}
    </AppText>
  </TouchableOpacity>
);

const NavCard = ({ title, subtitle, icon, color, onPress }: any) => (
  <TouchableOpacity
    style={[styles.navCard, { borderLeftColor: color, borderLeftWidth: 4 }]}
    onPress={onPress}
  >
    <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
      {icon}
    </View>
    <AppText type="bold" style={{ fontSize: 15 }}>
      {title}
    </AppText>
    <AppText style={{ fontSize: 12, color: "#6B7280" }}>{subtitle}</AppText>
  </TouchableOpacity>
);

// ─── MAIN PAGE ───────────────────────────────────────────────────────────

const FamilyDetailPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.user);

  const [familyData, setFamilyData] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useGlobalSpinner(loading);

  const fetchInitialData = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const response: any = await dispatch(
        getFamilyById(id as string)
      ).unwrap();
      setFamilyData(response);
      console.warn(response.family.member, "responseresponse");

      // Only fetch join requests if user is the owner
      if (response.isOwner) {
        const requests = await dispatch(getJoinRequests(id as string)).unwrap();
        setJoinRequests(requests || []);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [id])
  );

  // ─── ACTIONS ─────────────────────────────────────────────────────────────

  const handleJoinRequest = async () => {
    try {
      setLoading(true);
      await dispatch(requestToJoin(id as string)).unwrap();
      Alert.alert("Success", "Join request sent to the owner.");
      fetchInitialData();
    } catch (err: any) {
      Alert.alert("Error", err || "Failed to send request");
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
      fetchInitialData();
    } catch (err: any) {
      Alert.alert("Error", err || "Action failed");
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
      fetchInitialData();
    } catch (err: any) {
      Alert.alert("Error", "Action failed");
      setLoading(false);
    }
  };

  // ─── DYNAMIC FEATURE FILTERING ──────────────────────────────────────────

  const getFeatures = (family: any, isOwner: boolean) => {
    const fId = family._id;
    const type = family.familyType;
    //const params = { familyId: fId, isOwner: String(isOwner) };
    const params = { 
      familyId: fId, 
      isOwner: String(isOwner),
      currentMembers: JSON.stringify(family.members || []) 
  };

    const summary = family.unreadSummary || {};
    const contentStatus = family.contentStatus || [];

    const getBadge = (contentType: string) => {
      const item = contentStatus.find((c: any) => c.type === contentType);
      return item ? item.unreadCount : 0;
    };

    const navigateToContent = (contentType: string) => {
      router.push({
        pathname: "/family/content-management",
        params: { ...params, contentType },
      });
    };

    const isPersonalFamily =
      type === "Nuclear Family" || type === "Extended Family";

    const modules: Record<string, any> = {
      invite: {
        label: "Invite",
        icon: <UserPlus size={20} color="#3B82F6" />,
        badge: 0, // You can map this to a specific invite-related badge if available
        onPress: () =>
          router.push({
            pathname: "/family/invite",
            params, // Passing familyId, isOwner, and currentMembers
          }),
      },

      news: {
        label: "News",
        icon: <FileText size={20} color="#3B82F6" />,
        badge: summary.news || 0,
        onPress: () => router.push({ pathname: "/family/news", params }),
      },
      tasks: {
        label: "Tasks",
        icon: <ClipboardList size={20} color="#10B981" />,
        badge: summary.tasks || getBadge("Task") || 0,
        onPress: () => {
          if (isPersonalFamily) {
            navigateToContent("Task");
          } else {
            router.push({ pathname: "/family/tasks", params });
          }
        },
      },
      keydates: {
        label: "Key Dates",
        icon: <Calendar size={20} color="#F59E0B" />,
        badge: getBadge("Key Date") || 0,
        onPress: () =>
          router.push({
            pathname: "/family/keydates", // Or your specific KeyDatesPage path
            params: {
              familyId: fId,
              contentType: "Key Date", // Tells the page to load events
              isOwner: String(isOwner),
            },
          }),
      },
      reports: {
        label: "Reports",
        icon: <BarChart3 size={20} color="#6B7280" />,
        badge: summary.reports || 0,
        onPress: () =>
          router.push({
            pathname: "/family/reports",
            params: {
              familyId: fId,
              familyName: family.familyName,
              isOwner: String(isOwner),
              members: JSON.stringify(family.members),
              userId: user?._id || user?.id,
            },
          }),
      },
      suggestions: {
        label: "Suggestions",
        icon: <MessageSquare size={20} color="#F59E0B" />,
        badge: getBadge("Suggestion Box"),
        onPress: () => navigateToContent("Suggestion Box"),
      },
      polls: {
        label: "Polls",
        icon: <BarChart3 size={20} color="#6366F1" />,
        badge: summary.polls || 0,
        onPress: () => router.push({ pathname: "/family/polls", params }),
      },
      tree: {
        label: "Family Tree",
        icon: <GitGraph size={20} color="#059669" />,
        badge: getBadge("Family Tree"),
        onPress: () => navigateToContent("Family Tree"),
      },
      history: {
        label: "History",
        icon: <History size={20} color="#7C3AED" />,
        badge: getBadge("History"),
        onPress: () => navigateToContent("History"),
      },
      village: {
        label: "My Village",
        icon: <MapPin size={20} color="#D97706" />,
        badge: getBadge("My Village"),
        onPress: () => navigateToContent("My Village"),
      },
      traditions: {
        label: "Traditions",
        icon: <ShieldCheck size={20} color="#DC2626" />,
        badge: getBadge("Village Tradition"),
        onPress: () => navigateToContent("Village Tradition"),
      },
      language: {
        label: "Language",
        icon: <BookOpen size={20} color="#2563EB" />,
        badge: getBadge("Language Lesson"),
        onPress: () => navigateToContent("Language Lesson"),
      },
      resolutions: {
        label: "Resolutions",
        icon: <ClipboardList size={20} color="#0891B2" />,
        badge: getBadge("Resolution"),
        onPress: () => navigateToContent("Resolution"),
      },
      kings: {
        label: "Kings",
        icon: <Crown size={20} color="#EAB308" />,
        badge: getBadge("King"),
        onPress: () => navigateToContent("King"),
      },
      patriarchs: {
        label: "Leaders",
        icon: <Users size={20} color="#4B5563" />,
        badge: getBadge("Patriarch"),
        onPress: () => navigateToContent("Patriarch"),
      },
      donations: {
        label: "Donations",
        icon: <Heart size={20} color="#EF4444" />,
        onPress: () => router.push({ pathname: "/family/donations", params }),
      },
      ai: {
        label: "AI Assistant",
        icon: <Sparkles size={20} color="#8B5CF6" />,
        // onPress: () => router.push({ pathname: "/family/ai", params }),
      },
    };

    const mapping: Record<string, any[]> = {
      "Workplace Team": [
        modules.news,
        modules.tasks,
        modules.reports,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.ai,
        modules.invite,
      ],
      "Alumni Group": [
        modules.news,
        modules.history,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.ai,
        modules.invite,
      ],
      "Nuclear Family": [
        modules.news,
        modules.tree,
        modules.history,
        modules.village,
        modules.traditions,
        modules.language,
        modules.ai,
        modules.invite,
        modules.resolutions,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.tasks,
        modules.keydates,
      ],
      "Extended Family": [
        modules.news,
        modules.patriarchs,
        modules.history,
        modules.village,
        modules.traditions,
        modules.language,
        modules.ai,
        modules.invite,
        modules.resolutions,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.tasks,
        modules.keydates,
      ],
      "Religious Group": [
        modules.news,
        modules.resolutions,
        modules.suggestions,
        modules.donations,
        modules.ai,
        modules.invite,
      ],
      Community: [
        modules.news,
        modules.kings,
        modules.patriarchs,
        modules.history,
        modules.village,
        modules.traditions,
        modules.language,
        modules.ai,
        modules.invite,
        modules.resolutions,
        modules.suggestions,
        modules.polls,
        modules.donations,
      ],
    };

    let selectedFeatures = [...(mapping[type] || [ modules.news, modules.ai])];

    // ONLY SHOW ADMIN IF OWNER (currently commented out in original)
    // if (isOwner) {
    //   selectedFeatures.push(modules.management);
    // }

    return selectedFeatures;
  };

  if (!familyData || !user) return null;

  const { family, isOwner } = familyData;
  const isMember = family.isMember || isOwner;
  const hasRequested = family.isJoinRequestSent;
  const isInvited = family.isInviteSent;
  const features = getFeatures(family, isOwner);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>
          {family.familyName}
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInitialData(true)}
            colors={["#EAB308"]}
          />
        }
      >
        {/* PROFILE SECTION */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Users size={40} color="#EAB308" />
          </View>
          <AppText type="bold" style={{ fontSize: 24, marginTop: 12 }}>
            {family.familyName}
          </AppText>
          <View style={styles.typeBadge}>
            <Info size={14} color="#EAB308" />
            <AppText style={styles.typeBadgeText}>{family.familyType}</AppText>
          </View>
        </View>

        {!isMember ? (
          /* GUEST VIEW */
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
                  The owner has invited you to join.
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
                  Pending Approval
                </AppText>
                <AppText style={styles.statusSub}>
                  Waiting for owner approval.
                </AppText>
                <View style={styles.disabledBtn}>
                  <AppText type="bold" style={{ color: "#9CA3AF" }}>
                    Request Sent
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <Users size={40} color="#EAB308" style={{ marginBottom: 12 }} />
                <AppText type="bold" style={styles.statusTitle}>
                  Join Circle
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
          /* MEMBER VIEW */
          <>
            <View style={styles.grid}>
              <NavCard
                title="Members"
                subtitle={`${family.members?.length || 0} Joined`}
                icon={<Users size={24} color="#3B82F6" />}
                color="#3B82F6"
                onPress={() =>
                  router.push({
                    pathname: "/family/members",
                    params: {
                      members: JSON.stringify(family.members),
                      familyId: family?._id,
                    },
                  })
                }
              />
              <NavCard
                title="AI Helper"
                subtitle="Ask questions"
                icon={<Sparkles size={24} color="#8B5CF6" />}
                color="#8B5CF6"
                onPress={() =>
                  // router.push({
                  //   pathname: "/family/ai",
                  //   params: { familyId: family._id },
                  // })
                  console.warn("h")
                }
              />
            </View>

            {/* JOIN REQUESTS (OWNER ONLY) */}
            {isOwner && joinRequests.length > 0 && (
              <View style={styles.ownerRequestSection}>
                <AppText type="bold" style={styles.sectionHeading}>
                  Pending Requests
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

            {/* INVITE CODE (OWNER ONLY) */}
            {isOwner && (
              <View style={styles.inviteBox}>
                <AppText type="bold">Invite Code</AppText>
                <TouchableOpacity
                  style={styles.codeRow}
                  onPress={() => {
                    Clipboard.setString(family.inviteCode);
                    Alert.alert("Copied");
                  }}
                >
                  <AppText type="bold" style={styles.codeText}>
                    {family.inviteCode}
                  </AppText>
                  <Copy size={20} color="#EAB308" />
                </TouchableOpacity>
              </View>
            )}

            {/* FEATURES GRID */}
            <AppText type="bold" style={styles.sectionHeading}>
              Circle Features
            </AppText>
            <View style={styles.featureContainer}>
              {features.map((f: any, i: number) => (
                <SidebarItem key={i} {...f} />
              ))}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  profileSection: { alignItems: "center", paddingVertical: 20 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEFCE8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FDE68A",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFCE8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  typeBadgeText: { fontSize: 12, color: "#854D0E", fontWeight: "600" },

  statusCard: {
    margin: 20,
    padding: 30,
    backgroundColor: "#FFF",
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
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

  grid: { flexDirection: "row", padding: 20, gap: 15 },
  navCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 15,
    marginTop: 10,
  },
  featureContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  sidebarItem: {
    width: (width - 60) / 3,
    alignItems: "center",
    paddingVertical: 15,
    marginHorizontal: 5,
    marginBottom: 10,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sidebarItemLabel: { fontSize: 11, color: "#4B5563", marginTop: 8 },
  iconWrapper: { position: "relative" },
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

  ownerRequestSection: { marginBottom: 10 },
  reqItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    marginHorizontal: 20,
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
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
  },
  codeText: { fontSize: 20, color: "#EAB308", letterSpacing: 3 },
});

export default FamilyDetailPage;
