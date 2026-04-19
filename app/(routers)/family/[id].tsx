import React, { useState, useCallback, useRef } from "react";
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
  Animated,
  Modal,
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
  UserPlus,
  Clock,
  Check,
  X,
  LayoutGrid,
  List,
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

const LoadingOverlay = ({ visible }: { visible: boolean }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#FFE66D" />
        <AppText
          type="bold"
          style={{ marginTop: 15, color: "#FFE66D", fontSize: 16 }}
        >
          Synchronizing...
        </AppText>
      </View>
    </View>
  </Modal>
);

const SidebarItem = ({ icon, label, onPress, badge, isGrid }: any) => (
  <TouchableOpacity
    style={isGrid ? styles.gridItem : styles.listItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.iconWrapper}>
      <View style={styles.featureIconBox}>{icon}</View>
      {badge > 0 && (
        <View style={styles.sidebarBadge}>
          <AppText style={styles.badgeText}>
            {badge > 99 ? "99+" : badge}
          </AppText>
        </View>
      )}
    </View>
    <View style={isGrid ? null : styles.listTextWrapper}>
      <AppText
        type="bold"
        style={isGrid ? styles.gridItemLabel : styles.listItemLabel}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {!isGrid && (
        <AppText style={styles.listSubText}>Tap to explore circle data</AppText>
      )}
    </View>
  </TouchableOpacity>
);

const NavCard = ({ title, subtitle, icon, color, onPress }: any) => (
  <TouchableOpacity
    style={[styles.navCard, { borderBottomColor: color, borderBottomWidth: 3 }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.iconBox, { backgroundColor: color + "10" }]}>
      {icon}
    </View>
    <View>
      <AppText type="bold" style={{ fontSize: 16, color: "#1E293B" }}>
        {title}
      </AppText>
      <AppText style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
        {subtitle}
      </AppText>
    </View>
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
  const [isGridView, setIsGridView] = useState(true);

  useGlobalSpinner(loading);

  const fetchInitialData = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const response: any = await dispatch(
        getFamilyById(id as string)
      ).unwrap();
      setFamilyData(response);

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

  const handleJoinRequest = async () => {
    try {
      setLoading(true);
      await dispatch(requestToJoin(id as string)).unwrap();
      Alert.alert("Request Sent", "Waiting for circle owner approval.");
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
        Alert.alert("Welcome!", "You are now a member of this circle.");
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

  const getFeatures = (family: any, isOwner: boolean) => {
    const fId = family._id;
    const type = family.familyType;
    const params = {
      familyId: fId,
      familyName: family.familyName,
      familyCode: family.inviteCode,
      isOwner: String(isOwner),
      currentMembers: JSON.stringify(family.members || []),
    };

    const summary = family.unreadSummary || {};
    const contentStatus = family.contentStatus || [];

    const getBadge = (contentType: string) => {
      const item = contentStatus.find((c: any) => c.type === contentType);
      return item ? item.unreadCount : 0;
    };

    const navigateToContent = (contentType: string) => {
      router.push({
        pathname: "/family/contents/content-management",
        params: { ...params, contentType },
      });
    };

    const modules: Record<string, any> = {
      invite: {
        label: "Invite",
        icon: <UserPlus size={22} color="#3B82F6" />,
        badge: 0,
        onPress: () => router.push({ pathname: "/family/invite", params }),
      },
      news: {
        label: "News",
        icon: <FileText size={22} color="#3B82F6" />,
        badge: summary.news || 0,
        onPress: () => router.push({ pathname: "/family/news/news", params }),
      },
      tasks: {
        label: "Tasks",
        icon: <ClipboardList size={22} color="#10B981" />,
        badge: summary.tasks || getBadge("Task") || 0,
        onPress: () => router.push({ pathname: "/family/tasks/tasks", params }),
      },
      keydates: {
        label: "Key Dates",
        icon: <Calendar size={22} color="#F59E0B" />,
        badge: getBadge("Key Date") || 0,
        onPress: () =>
          router.push({
            pathname: "/family/keydates",
            params: {
              familyId: fId,
              contentType: "Key Date",
              isOwner: String(isOwner),
            },
          }),
      },
      reports: {
        label: "Reports",
        icon: <BarChart3 size={22} color="#6366F1" />,
        badge: summary.reports || 0,
        onPress: () =>
          router.push({
            pathname: "/family/reports",
            params: { ...params, userId: user?._id || user?.id },
          }),
      },
      suggestions: {
        label: "Suggestions",
        icon: <MessageSquare size={22} color="#F59E0B" />,
        badge: getBadge("Suggestion Box"),
        onPress: () => navigateToContent("Suggestion Box"),
      },
      polls: {
        label: "Polls",
        icon: <BarChart3 size={22} color="#8B5CF6" />,
        badge: summary.polls || 0,
        onPress: () => router.push({ pathname: "/family/polls/polls", params }),
      },
      tree: {
        label: "Tree",
        icon: <GitGraph size={22} color="#059669" />,
        badge: getBadge("Family Tree"),
        onPress: () => navigateToContent("Family Tree"),
      },
      history: {
        label: "History",
        icon: <History size={22} color="#7C3AED" />,
        badge: getBadge("History"),
        onPress: () => navigateToContent("History"),
      },
      village: {
        label: "Village",
        icon: <MapPin size={22} color="#D97706" />,
        badge: getBadge("My Village"),
        onPress: () => navigateToContent("My Village"),
      },
      traditions: {
        label: "Traditions",
        icon: <ShieldCheck size={22} color="#DC2626" />,
        badge: getBadge("Village Tradition"),
        onPress: () => navigateToContent("Village Tradition"),
      },
      safety: {
        label: "Safety Net",
        icon: <ShieldCheck size={22} color="#F43F5E" />,
        badge: getBadge("Safety Net"),
        onPress: () =>
          router.push({ pathname: "/(routers)/family/SafetyNetPage", params }),
      },
      language: {
        label: "Language",
        icon: <BookOpen size={22} color="#2563EB" />,
        badge: getBadge("Language Lesson"),
        onPress: () => navigateToContent("Language Lesson"),
      },
      donations: {
        label: "Donations",
        icon: <Heart size={22} color="#EF4444" />,
        badge: summary.donations || 0,
        onPress: () => router.push({ pathname: "/family/donations", params }),
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
        modules.invite,
      ],
      Others: [
        modules.news,
        modules.tasks,
        modules.reports,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.invite,
        modules.safety,
        modules.keydates,
      ],
      "Nuclear Family": [
        modules.news,
        modules.tree,
        modules.history,
        modules.village,
        modules.traditions,
        modules.language,
        modules.invite,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.tasks,
        modules.keydates,
        modules.safety,
      ],
      "Extended Family": [
        modules.news,
        modules.history,
        modules.village,
        modules.traditions,
        modules.language,
        modules.invite,
        modules.suggestions,
        modules.polls,
        modules.donations,
        modules.tasks,
        modules.keydates,
        modules.safety,
      ],
      "Religious Group": [
        modules.news,
        modules.suggestions,
        modules.donations,
        modules.invite,
      ],
      Community: [
        modules.news,
        modules.history,
        modules.village,
        modules.traditions,
        modules.language,
        modules.invite,
        modules.suggestions,
        modules.polls,
        modules.donations,
      ],
    };

    return mapping[type] || [modules.news, modules.invite];
  };

  if (!familyData || !user) return null;

  const { family, isOwner } = familyData;
  const isMember = family.isMember || isOwner;
  const hasRequested = family.isJoinRequestSent;
  const isInvited = family.isInviteSent;
  const features = getFeatures(family, isOwner);

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 20, color: "#0F172A" }}>
          {family.familyName}
        </AppText>
        <TouchableOpacity
          onPress={() => setIsGridView(!isGridView)}
          style={styles.headerIconBtn}
        >
          {isGridView ? (
            <List size={22} color="#EAB308" />
          ) : (
            <LayoutGrid size={22} color="#EAB308" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInitialData(true)}
            colors={["#EAB308"]}
            tintColor="#EAB308"
          />
        }
      >
        {/* PROFILE HERO */}
        <View style={styles.heroSection}>
          <View style={styles.avatarGlow}>
            <View style={styles.avatarLarge}>
              <Users size={36} color="#EAB308" />
            </View>
          </View>
          <AppText
            type="bold"
            style={{ fontSize: 26, marginTop: 16, color: "#0F172A" }}
          >
            {family.familyName}
          </AppText>
          <View style={styles.typeBadge}>
            <Sparkles size={12} color="#854D0E" />
            <AppText style={styles.typeBadgeText}>{family.familyType}</AppText>
          </View>
        </View>

        {!isMember ? (
          <View style={styles.statusCard}>
            {isInvited ? (
              <>
                <Sparkles
                  size={44}
                  color="#EAB308"
                  style={{ marginBottom: 16 }}
                />
                <AppText type="bold" style={styles.statusTitle}>
                  You're Invited!
                </AppText>
                <AppText style={styles.statusSub}>
                  A circle owner has granted you access. Join the sanctuary.
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
                <Clock size={44} color="#94A3B8" style={{ marginBottom: 16 }} />
                <AppText type="bold" style={styles.statusTitle}>
                  Awaiting Entry
                </AppText>
                <AppText style={styles.statusSub}>
                  Your join request is pending review by the circle owner.
                </AppText>
                <View style={styles.disabledBtn}>
                  <AppText type="bold" style={{ color: "#64748B" }}>
                    Request Sent
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <Users size={44} color="#EAB308" style={{ marginBottom: 16 }} />
                <AppText type="bold" style={styles.statusTitle}>
                  Private Circle
                </AppText>
                <AppText style={styles.statusSub}>
                  Request access to collaborate and preserve heritage within
                  this circle.
                </AppText>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleJoinRequest}
                >
                  <AppText type="bold" style={{ fontSize: 16 }}>
                    Request Access
                  </AppText>
                  <UserPlus size={20} color="#000" />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.quickGrid}>
              <NavCard
                title="Members"
                subtitle={`${family.members?.length || 0} Connected`}
                icon={<Users size={22} color="#3B82F6" />}
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
                title="Sanctuary AI"
                subtitle="Heritage Bot"
                icon={<Sparkles size={22} color="#8B5CF6" />}
                color="#8B5CF6"
                onPress={() =>
                  Alert.alert(
                    "Coming Soon",
                    "The AI Sanctuary assistant is currently in development."
                  )
                }
              />
            </View>

            {isOwner && joinRequests.length > 0 && (
              <View style={styles.ownerRequestSection}>
                <AppText type="bold" style={styles.sectionHeading}>
                  Entry Requests
                </AppText>
                {joinRequests.map((req) => (
                  <View key={req._id} style={styles.reqItem}>
                    <View style={{ flex: 1 }}>
                      <AppText type="bold" style={{ fontSize: 16 }}>
                        {req.firstName} {req.lastName}
                      </AppText>
                      <AppText
                        style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}
                      >
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

            {isOwner && (
              <View style={styles.inviteBox}>
                <View style={styles.inviteHeader}>
                  <AppText type="bold" style={{ color: "#854D0E" }}>
                    Circle Invite Code
                  </AppText>
                  <Info size={14} color="#854D0E" />
                </View>
                <TouchableOpacity
                  style={styles.codeRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    Clipboard.setString(family.inviteCode);
                    Alert.alert("Copied", "Invite code copied to clipboard.");
                  }}
                >
                  <AppText type="bold" style={styles.codeText}>
                    {family.inviteCode}
                  </AppText>
                  <View style={styles.copyBadge}>
                    <Copy size={16} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.featuresHeader}>
              <AppText type="bold" style={styles.sectionHeading}>
                Circle Ecosystem
              </AppText>
              <AppText style={{ color: "#64748B", fontSize: 12 }}>
                {features.length} Active Modules
              </AppText>
            </View>

            <View style={isGridView ? styles.featureGrid : styles.featureList}>
              {features.map((f: any, i: number) => (
                <SidebarItem key={i} {...f} isGrid={isGridView} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderBox: {
    backgroundColor: "#1E293B",
    padding: 40,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#FFF",
  },
  avatarGlow: { padding: 4, borderRadius: 50, backgroundColor: "#FEF9C3" },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 13,
    color: "#854D0E",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  statusCard: {
    margin: 20,
    padding: 32,
    backgroundColor: "#FFF",
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statusTitle: { fontSize: 22, color: "#0F172A", marginBottom: 10 },
  statusSub: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 28,
    lineHeight: 20,
  },
  buttonGroup: { width: "100%", gap: 12 },
  acceptBtn: {
    backgroundColor: "#10B981",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  declineBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#EAB308",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    shadowColor: "#EAB308",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledBtn: {
    backgroundColor: "#F1F5F9",
    padding: 18,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },

  quickGrid: { flexDirection: "row", padding: 20, gap: 16 },
  navCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  featuresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
  },
  sectionHeading: {
    fontSize: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 12,
    color: "#0F172A",
  },

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  featureList: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  gridItem: {
    width: (width - 60) / 3,
    alignItems: "center",
    paddingVertical: 20,
    marginHorizontal: 6,
    marginBottom: 12,
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  listTextWrapper: { flex: 1 },
  gridItemLabel: {
    fontSize: 12,
    color: "#334155",
    marginTop: 10,
    textAlign: "center",
  },
  listItemLabel: { fontSize: 16, color: "#334155" },
  listSubText: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  iconWrapper: { position: "relative" },
  sidebarBadge: {
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
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },

  ownerRequestSection: { marginBottom: 12 },
  reqItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  row: { flexDirection: "row", gap: 12 },
  iconBtnGreen: {
    backgroundColor: "#10B981",
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnRed: {
    backgroundColor: "#EF4444",
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  inviteBox: {
    margin: 20,
    padding: 24,
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FEF9C3",
  },
  inviteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  codeText: { fontSize: 22, color: "#854D0E", letterSpacing: 4 },
  copyBadge: { backgroundColor: "#EAB308", padding: 8, borderRadius: 10 },
});

export default FamilyDetailPage;
