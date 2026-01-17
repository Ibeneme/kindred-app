import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  ShieldCheck,
  UserCog,
  Info,
  CheckCircle2,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import { updateMemberRights } from "@/src/redux/slices/familySlice";

const PERMISSION_CONFIG = [
  { key: "canPostNews", label: "Can post family news" },
  { key: "canPostSuggestions", label: "Can post suggestions" },
  { key: "canParticipatePolls", label: "Can participate in polls" },
  { key: "canMakeDonations", label: "Can make donations" },
  { key: "canComment", label: "Can comment and interact" },
  { key: "canManageMembers", label: "Can manage members" },
  { key: "canCreatePolls", label: "Can create polls" },
  { key: "canDeleteAnyContent", label: "Can delete any content" },
];

const ROLES = [
  { label: "Member", value: "member" },
  { label: "Moderator", value: "moderator" },
  { label: "Admin", value: "admin" },
];

const MemberRestrictionsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId, memberData } = useLocalSearchParams<{
    familyId: string;
    memberData: string;
  }>();

  // Parse the member object passed from the previous screen
  const member = JSON.parse(memberData || "{}");

  const [rights, setRights] = useState<Record<string, boolean>>(
    member.rights || {}
  );
  const [role, setRole] = useState(member.role || "member");
  const [reason, setReason] = useState(member.restrictionReason || "");
  const [isSaving, setIsSaving] = useState(false);

  const toggleRight = (key: string) => {
    setRights((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyRestrictions = async () => {
    setIsSaving(true);
    try {
      await dispatch(
        updateMemberRights({
          familyId: familyId!,
          userId: member.user._id,
          rightsUpdates: {
            rightsUpdates: rights,
            restrictionReason: reason,
            role: role, // Added role update capability
          },
        })
      ).unwrap();

      Alert.alert("Success", "Member permissions updated successfully");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err || "Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Manage Permissions
        </AppText>
        <TouchableOpacity onPress={handleApplyRestrictions} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <CheckCircle2 size={24} color="#10B981" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* MEMBER PROFILE CARD */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                member.user.profilePicture || "https://via.placeholder.com/100",
            }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <AppText type="bold" style={styles.memberName}>
              {member.user.firstName} {member.user.lastName}
            </AppText>
            <AppText style={styles.memberEmail}>{member.user.email}</AppText>
            <View style={styles.roleBadge}>
              <AppText style={styles.roleText}>{role.toUpperCase()}</AppText>
            </View>
          </View>
        </View>

        {/* ROLE SELECTION */}
        <AppText type="bold" style={styles.sectionTitle}>
          Assign Role
        </AppText>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.roleItem,
                role === r.value && styles.roleItemActive,
              ]}
              onPress={() => setRole(r.value)}
            >
              <UserCog
                size={18}
                color={role === r.value ? "#FFF" : "#6B7280"}
              />
              <AppText
                style={[
                  styles.roleItemLabel,
                  role === r.value && { color: "#FFF" },
                ]}
              >
                {r.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* PERMISSIONS LIST */}
        <View style={styles.sectionHeader}>
          <AppText type="bold" style={styles.sectionTitle}>
            Granular Rights
          </AppText>
          <ShieldCheck size={18} color="#6B7280" />
        </View>

        <View style={styles.rightsContainer}>
          {PERMISSION_CONFIG.map((item) => (
            <View key={item.key} style={styles.rightRow}>
              <AppText style={styles.rightLabel}>{item.label}</AppText>
              <Switch
                value={!!rights[item.key]}
                onValueChange={() => toggleRight(item.key)}
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* RESTRICTION REASON */}
        <View style={styles.reasonSection}>
          <View style={styles.row}>
            <AppText type="bold" style={styles.sectionTitle}>
              Restriction Note
            </AppText>
            <AppText style={styles.optionalText}>(optional)</AppText>
          </View>
          <TextInput
            style={styles.reasonInput}
            placeholder="Why are you restricting/promoting this member?"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.applyButton, isSaving && { opacity: 0.7 }]}
          onPress={handleApplyRestrictions}
          disabled={isSaving}
        >
          <AppText type="bold" style={styles.applyButtonText}>
            {isSaving ? "Updating..." : "Apply Changes"}
          </AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, color: "#111827" },
  backButton: { padding: 4 },
  scrollBody: { padding: 20 },
  profileCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F3F4F6",
  },
  profileInfo: { marginLeft: 16, flex: 1 },
  memberName: { fontSize: 18, color: "#111827" },
  memberEmail: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  roleBadge: {
    backgroundColor: "#FEF3C7",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  roleText: { fontSize: 10, fontWeight: "900", color: "#B45309" },
  sectionTitle: { fontSize: 16, color: "#374151", marginBottom: 15 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  roleGrid: { flexDirection: "row", gap: 10, marginBottom: 25 },
  roleItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleItemActive: { backgroundColor: "#111827", borderColor: "#111827" },
  roleItemLabel: { fontSize: 13, color: "#4B5563", fontWeight: "600" },
  rightsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  rightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  rightLabel: { fontSize: 15, color: "#4B5563" },
  reasonSection: { marginBottom: 30 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionalText: { fontSize: 12, color: "#9CA3AF", marginBottom: 15 },
  reasonInput: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
    fontSize: 15,
  },
  applyButton: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 50,
  },
  applyButtonText: { color: "#FFF", fontSize: 16 },
});

export default MemberRestrictionsPage;
