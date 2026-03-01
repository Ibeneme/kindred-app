import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MessageCircle,
  Edit2,
  Lock,
  Phone,
  UserX,
  UserCheck,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/redux/store";
import { updateFamilyMember } from "@/src/redux/slices/familyMemberSlice";
import {
  suspendFamilyMember,
  unsuspendFamilyMember,
} from "@/src/redux/slices/familySlice"; // Adjust import based on your file structure
import axiosInstance from "@/src/redux/services/axiosInstance";
import { fetchUserProfile } from "@/src/redux/slices/userSlice";

const ROLES = ["Member", "Moderator", "Admin"] as const;

const ALL_RIGHTS_KEYS = [
  "canManageMembers",
  "canPostNews",
  "canDeleteAnyContent",
  "canCreatePolls",
  "canPostSuggestions",
  "canParticipateInPolls",
  "canMakeDonations",
  "canCommentInteract",
  "isAdmin",
  "isModerator",
] as const;

type Role = (typeof ROLES)[number];

interface Member {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  role: string;
  isOnline?: boolean;
  suspended?: boolean;
  uuid?: string | null;
  rights: Record<(typeof ALL_RIGHTS_KEYS)[number], boolean>;
}

const FamilyMembersPage = () => {
  const params = useLocalSearchParams<{
    familyName?: string;
    familyId: string;
    members?: string;
  }>();

  const { familyName, familyId, members: membersParam } = params;
  const router = useRouter();
  const dispatch = useDispatch<any>();
  const { user } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    dispatch(fetchUserProfile());
 
  }, [dispatch]);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper to identify the current user within the member list
  const currentUserMember = members.find(
    (m) => m.userId === user?._id || m._id === user?._id
  );
  const myFamilyRole = currentUserMember?.role?.toLowerCase() || "";
  const canEdit = ["admin", "owner"].includes(myFamilyRole);

  const normalizeMembers = (data: any[]) => {
    return data.map((m: any) => {
      const role = m.role ?? "Member";
      const baseRights = Object.fromEntries(
        ALL_RIGHTS_KEYS.map((k) => [k, false])
      ) as Record<(typeof ALL_RIGHTS_KEYS)[number], boolean>;

      return {
        ...m,
        // Crucial: Use _id as userId if userId is missing (per your console logs)
        userId: m.userId || m._id,
        role,
        suspended: m.suspended || false,
        rights: {
          ...baseRights,
          ...m.rights,
          isAdmin: role.toLowerCase() === "admin",
          isModerator: role.toLowerCase() === "moderator",
        },
      };
    });
  };

  const fetchFamilyMembers = useCallback(async () => {
    setError(null);

    // 1. Try loading from navigation params immediately
    if (membersParam && !refreshing) {
      try {
        const parsed = JSON.parse(membersParam);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(normalizeMembers(parsed));
          setLoading(false);
        }
      } catch (e) {
        console.error("❌ Failed to parse members param", e);
      }
    }

    if (!familyId) {
      setLoading(false);
      return;
    }

    // 2. Fetch/Refresh from API
    try {
      const res = await axiosInstance.post("/family-members/get-members", {
        familyId,
      });
      if (res.data.members && res.data.members.length > 0) {
        setMembers(normalizeMembers(res.data.members));
      } else if (members.length === 0) {
        setError("No members found.");
      }
    } catch (err: any) {
      if (members.length === 0) setError("Failed to load members.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId, membersParam, refreshing, members.length]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFamilyMembers();
  };

  const handleToggleSuspension = async (member: Member) => {
    const actionLabel = member.suspended ? "unsuspend" : "suspend";
    const targetUserId = member.userId || member._id;

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${actionLabel} ${member.firstName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: member.suspended ? "default" : "destructive",
          onPress: async () => {
            try {
              if (member.suspended) {
                await dispatch(
                  unsuspendFamilyMember({ familyId, userId: targetUserId })
                ).unwrap();
              } else {
                await dispatch(
                  suspendFamilyMember({ familyId, userId: targetUserId })
                ).unwrap();
              }
              // Update local state UI
              setMembers((prev) =>
                prev.map((m) =>
                  m._id === member._id || m.userId === targetUserId
                    ? { ...m, suspended: !m.suspended }
                    : m
                )
              );
              Alert.alert("Success", `User has been ${actionLabel}ed.`);
            } catch (err: any) {
              Alert.alert(
                "Error",
                typeof err === "string" ? err : `Failed to ${actionLabel} user.`
              );
            }
          },
        },
      ]
    );
  };

  const handleMemberPress = (member: Member) => {
    if (member.suspended) {
      Alert.alert("Access Denied", "You cannot message a suspended member.");
      return;
    }
    const receiverId = member.userId || member._id;
    const receiverName = `${member.firstName || ""} ${
      member.lastName || ""
    }`.trim();

    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: member.uuid || "",
        senderId: user?._id,
        receiverId,
        receiverName,
        receiverProfilePicture: member.profilePicture || "",
      },
    });
  };

  const handleRoleChange = (memberId: string, newRole: Role) => {
    setMembers((prev) =>
      prev.map((m) =>
        m._id === memberId
          ? {
              ...m,
              role: newRole,
              rights: {
                ...m.rights,
                isAdmin: newRole === "Admin",
                isModerator: newRole === "Moderator",
              },
            }
          : m
      )
    );
  };

  const saveAllChanges = useCallback(async () => {
    if (!familyId) return;
    setSaving(true);
    try {
      const updates = members
        .filter((m) => user?._id !== m.userId && user?._id !== m._id)
        .map((member) =>
          dispatch(
            updateFamilyMember({
              memberId: member._id,
              familyId,
              role: member.role.toLowerCase(),
              rights: member.rights,
              userId: member.userId,
            })
          ).unwrap()
        );
      await Promise.all(updates);
      setEditMode(false);
      Alert.alert("Success", "All changes have been saved.");
    } catch (err) {
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [members, familyId, user?._id, dispatch]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <AppText style={{ marginTop: 12, color: "#64748B" }}>
          Loading members...
        </AppText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconCircle}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {familyName || "Family"} Members
        </AppText>
        {canEdit ? (
          <TouchableOpacity
            onPress={() => setEditMode(!editMode)}
            style={[styles.editButton, editMode && styles.editButtonActive]}
          >
            <Edit2 size={18} color={editMode ? "#EAB308" : "#111827"} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {editMode && (
        <View style={styles.saveAllContainer}>
          <TouchableOpacity
            style={[styles.saveAllBtn, saving && styles.saveAllBtnDisabled]}
            onPress={saveAllChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <AppText type="bold" style={styles.saveAllBtnText}>
                Save Changes
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EAB308"
          />
        }
      >
        {error && members.length === 0 && (
          <AppText style={styles.errorText}>{error}</AppText>
        )}

        {members.map((member) => {
          const isMe = user?._id === member.userId || user?._id === member._id;
          const canEditThis = editMode && !isMe && canEdit;

          return (
            <View
              key={member._id}
              style={[
                styles.memberCard,
                isMe && styles.myCard,
                member.suspended && styles.suspendedCard,
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  {member.profilePicture ? (
                    <Image
                      source={{ uri: member.profilePicture }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <AppText type="bold" style={styles.initials}>
                      {member.firstName?.[0]}
                      {member.lastName?.[0]}
                    </AppText>
                  )}
                </View>
                <View style={styles.info}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <AppText
                      type="bold"
                      style={[
                        styles.name,
                        member.suspended && styles.suspendedText,
                      ]}
                    >
                      {member.firstName} {member.lastName} {isMe && "(You)"}
                    </AppText>
                    {member.suspended && (
                      <View style={styles.suspendedBadge}>
                        <AppText style={styles.suspendedBadgeText}>
                          Suspended
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={styles.email}>{member.email}</AppText>

                  {member.isOnline && !member.suspended && (
                    <View style={styles.onlineContainer}>
                      <View style={styles.onlineDot} />
                      <AppText style={styles.onlineText}>Online</AppText>
                    </View>
                  )}

                  <View style={styles.roleTag}>
                    <Lock
                      size={10}
                      color="#EAB308"
                      style={{ marginRight: 4 }}
                    />
                    <AppText style={styles.roleText}>{member.role}</AppText>
                  </View>
                </View>
              </View>

              {canEditThis && (
                <View style={styles.section}>
                  <AppText style={styles.sectionLabel}>System Role</AppText>
                  <View style={styles.grid}>
                    {ROLES.map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => handleRoleChange(member._id, r)}
                        style={[
                          styles.roleBtn,
                          member.role === r && styles.roleBtnActive,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.roleBtnText,
                            member.role === r && styles.roleBtnTextActive,
                          ]}
                        >
                          {r}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.suspendBtn,
                      member.suspended ? styles.unsuspendBtn : {},
                    ]}
                    onPress={() => handleToggleSuspension(member)}
                  >
                    {member.suspended ? (
                      <>
                        <UserCheck size={18} color="#059669" />
                        <AppText style={styles.unsuspendBtnText}>
                          Unsuspend Member
                        </AppText>
                      </>
                    ) : (
                      <>
                        <UserX size={18} color="#DC2626" />
                        <AppText style={styles.suspendBtnText}>
                          Suspend Member
                        </AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {!isMe && !member.suspended && !editMode && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => handleMemberPress(member)}
                  >
                    <MessageCircle size={18} color="#EAB308" />
                    <AppText type="bold" style={styles.chatBtnText}>
                      Send Message
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callBtn} disabled={true}>
                    <Phone size={18} color="#94A3B8" />
                    <AppText type="bold" style={styles.callBtnText}>
                      Call User
                    </AppText>
                    <View style={styles.comingSoonBadge}>
                      <AppText style={styles.comingSoonText}>Soon</AppText>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, color: "#111827" },
  editButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  editButtonActive: { backgroundColor: "#FEFCE8", borderColor: "#EAB308" },
  saveAllContainer: { padding: 16, backgroundColor: "#FFF" },
  saveAllBtn: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  saveAllBtnDisabled: { opacity: 0.6 },
  saveAllBtnText: { color: "#FFF", fontSize: 16 },
  scrollContent: { padding: 16 },
  memberCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  suspendedCard: { backgroundColor: "#F8FAFC", opacity: 0.7 },
  myCard: { borderLeftWidth: 5, borderLeftColor: "#EAB308" },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  initials: { color: "#64748B", fontSize: 16 },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, color: "#111827" },
  suspendedText: { color: "#94A3B8", textDecorationLine: "line-through" },
  suspendedBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  suspendedBadgeText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  email: { fontSize: 12, color: "#64748B" },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEFCE8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 10,
    color: "#EAB308",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  section: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  sectionLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: 10,
    fontWeight: "700",
  },
  onlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  onlineText: { color: "#22C55E", fontSize: 12, fontWeight: "500" },
  grid: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  roleBtnActive: { backgroundColor: "#EAB308", borderColor: "#EAB308" },
  roleBtnText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  roleBtnTextActive: { color: "#FFF" },
  suspendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 8,
  },
  suspendBtnText: { color: "#DC2626", fontWeight: "bold", fontSize: 13 },
  unsuspendBtn: { backgroundColor: "#ECFDF5", borderColor: "#D1FAE5" },
  unsuspendBtnText: { color: "#059669", fontWeight: "bold", fontSize: 13 },
  actionRow: { marginTop: 10, gap: 10 },
  chatBtn: {
    flexDirection: "row",
    backgroundColor: "#FEFCE8",
    padding: 14,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEF9C3",
  },
  chatBtnText: { color: "#EAB308", marginLeft: 8, fontSize: 14 },
  callBtn: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 15,
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  callBtnText: { color: "#94A3B8", marginLeft: 8, fontSize: 14, flex: 1 },
  comingSoonBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: { fontSize: 10, color: "#64748B", fontWeight: "bold" },
  errorText: { textAlign: "center", color: "#EF4444", marginTop: 20 },
});

export default FamilyMembersPage;
