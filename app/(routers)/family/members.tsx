import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
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
  CheckCircle2,
  Lock,
  Phone, // Added for Call
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/redux/store";
import { updateFamilyMember } from "@/src/redux/slices/familyMemberSlice";
import axiosInstance from "@/src/redux/services/axiosInstance";

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
  rights: Record<(typeof ALL_RIGHTS_KEYS)[number], boolean>;
}

const FamilyMembersPage = () => {
  const { familyName, familyId } = useLocalSearchParams<{
    familyName?: string;
    familyId: string;
  }>();

  const router = useRouter();
  const dispatch = useDispatch<any>();
  const { user } = useSelector((state: RootState) => state.user);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentUserMember = members.find((m) => m.userId === user?._id);
  const myFamilyRole = currentUserMember?.role?.toLowerCase() || "";
  const canEdit = ["admin", "owner"].includes(myFamilyRole);

  const fetchFamilyMembers = useCallback(async () => {
    if (!familyId) {
      setError("No family ID provided");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const res = await axiosInstance.post("/family-members/get-members", {
        familyId,
      });
      const serverMembers = res.data.members || [];

      const normalized = serverMembers.map((m: any) => {
        const role = m.role ?? "Member";
        const baseRights = Object.fromEntries(
          ALL_RIGHTS_KEYS.map((k) => [k, false])
        ) as Record<(typeof ALL_RIGHTS_KEYS)[number], boolean>;

        return {
          ...m,
          role,
          rights: {
            ...baseRights,
            ...m.rights,
            isAdmin: role.toLowerCase() === "admin",
            isModerator: role.toLowerCase() === "moderator",
          },
        };
      });

      setMembers(normalized);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load family members");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const handleMemberPress = (member: any) => {
    if (!user) return;
    if (user._id === member._id) return;
    console.warn(member, "membermember");
    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: member?.uuid,
        senderId: user._id,
        senderName: `${user.firstName} ${user.lastName}`,
        receiverId: member._id,
        receiverName: `${member.firstName} ${member.lastName}`,
        receiverProfilePicture: member.profilePicture || "",
      },
    });
  };

  const getInitials = (first?: string, last?: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "??";

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

  const handleRightToggle = (
    memberId: string,
    key: (typeof ALL_RIGHTS_KEYS)[number]
  ) => {
    setMembers((prev) =>
      prev.map((m) =>
        m._id === memberId
          ? { ...m, rights: { ...m.rights, [key]: !m.rights[key] } }
          : m
      )
    );
  };

  const saveAllChanges = useCallback(async () => {
    if (!familyId) return;
    setSaving(true);
    try {
      const updates = members
        .filter((m) => user?._id !== m.userId)
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
      await fetchFamilyMembers();
      setEditMode(false);
      Alert.alert("Success", "All changes have been saved.");
    } catch (err) {
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [members, familyId, user?._id, dispatch, fetchFamilyMembers]);

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
        {members.map((member) => {
          const isMe = user?._id === member.userId;
          const canEditThis = editMode && !isMe && canEdit;
          const displayedRights = canEditThis
            ? ALL_RIGHTS_KEYS
            : ALL_RIGHTS_KEYS.filter((key) => member.rights[key] === true);

          return (
            <View
              key={member._id}
              style={[styles.memberCard, isMe && styles.myCard]}
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
                      {getInitials(member.firstName, member.lastName)}
                    </AppText>
                  )}
                </View>
                <View style={styles.info}>
                  <AppText type="bold" style={styles.name}>
                    {member.firstName} {member.lastName}
                    {isMe && " (You)"}
                  </AppText>
                  <AppText style={styles.email}>{member.email}</AppText>
                  {!editMode && (
                    <View style={styles.roleTag}>
                      <Lock
                        size={10}
                        color="#EAB308"
                        style={{ marginRight: 4 }}
                      />
                      <AppText style={styles.roleText}>{member.role}</AppText>
                    </View>
                  )}
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
                </View>
              )}

              {/* <View style={styles.section}>
                <AppText style={styles.sectionLabel}>
                  {canEditThis ? "Manage Permissions" : "Permissions"}
                </AppText>
                <View style={styles.rightsColumn}>
                  {displayedRights.length > 0 ? (
                    displayedRights.map((key) => (
                      <View
                        key={key}
                        style={[
                          styles.rightRow,
                          !canEditThis && styles.viewOnlyRow,
                        ]}
                      >
                        <AppText style={styles.rightLabel}>
                          {key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^can/, "")
                            .trim()}
                        </AppText>
                        {canEditThis ? (
                          <Switch
                            value={member.rights[key]}
                            onValueChange={() =>
                              handleRightToggle(member._id, key)
                            }
                            trackColor={{ false: "#CBD5E1", true: "#FEF08A" }}
                            thumbColor={
                              member.rights[key] ? "#EAB308" : "#F8FAFC"
                            }
                          />
                        ) : (
                          <CheckCircle2 size={16} color="#10B981" />
                        )}
                      </View>
                    ))
                  ) : (
                    <AppText style={styles.noRights}>
                      No special permissions
                    </AppText>
                  )}
                </View>
              </View> */}

              {!isMe && (
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
                    <View style={styles.callContent}>
                      <Phone size={18} color="#94A3B8" />
                      <AppText type="bold" style={styles.callBtnText}>
                        Call User
                      </AppText>
                    </View>
                    <View style={styles.comingSoonBadge}>
                      <AppText style={styles.comingSoonText}>
                        Coming Soon
                      </AppText>
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
  rightsColumn: { gap: 6 },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  viewOnlyRow: {
    backgroundColor: "#FFF",
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  rightLabel: { fontSize: 13, color: "#334155", textTransform: "capitalize" },
  noRights: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 5,
  },
  actionRow: { marginTop: 20, gap: 10 },
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
    opacity: 0.8,
  },
  callContent: { flexDirection: "row", alignItems: "center" },
  callBtnText: { color: "#94A3B8", marginLeft: 8, fontSize: 14 },
  comingSoonBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: { fontSize: 10, color: "#64748B", fontWeight: "bold" },
});

export default FamilyMembersPage;
