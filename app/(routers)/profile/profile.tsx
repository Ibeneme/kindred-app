import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronLeft,
  Mail,
  Shield,
  Calendar,
  Phone,
  Info,
  CheckCircle2,
  Cake,
} from "lucide-react-native";

import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import { fetchUserById } from "@/src/redux/slices/userSlice";

// Define colors locally
const PRIMARY_YELLOW = "#FBBF24";
const PRIMARY_YELLOW_DARK = "#F59E0B";
const PRIMARY_YELLOW_LIGHT = "#FEF3C7";

const UserProfilePage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Local state to store the fetched profile data
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selector for the currently logged-in user (to handle "Send Message" logic)
  const { user: currentUser } = useSelector(
    (state: RootState) => state.auth || state.user
  );

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      // We unwrap the result to save it directly to local state
      const result = await dispatch(fetchUserById(id as string)).unwrap();
      setProfileData(result);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_YELLOW} />
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.centered}>
        <AppText>User not found</AppText>
      </View>
    );
  }

  const initials = `${profileData.firstName?.charAt(0) || ""}${
    profileData.lastName?.charAt(0) || ""
  }`.toUpperCase();

  const handleSendMessage = () => {
    if (!currentUser) return;

    const chatUuid = [currentUser._id, profileData._id].sort().join("_");

    router.push({
      pathname: "/(routers)/messages/chat",
      params: {
        uuid: chatUuid,
        senderId: currentUser._id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        receiverId: profileData._id,
        receiverName: `${profileData.firstName} ${profileData.lastName}`,
        receiverProfilePicture: profileData.profilePicture || "",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Profile
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Hero Section */}
        <View style={styles.profileHero}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarOuterBorder}>
              {profileData.profilePicture ? (
                <Image
                  source={{ uri: profileData.profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <AppText style={styles.avatarInitial}>{initials}</AppText>
                </View>
              )}
            </View>

            {profileData.isVerified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={22} color="#10B981" fill="#FFF" />
              </View>
            )}
          </View>

          <AppText type="bold" style={styles.userName}>
            {profileData.firstName} {profileData.lastName}
          </AppText>

          {profileData.bio && (
            <AppText style={styles.userBio}>{profileData.bio}</AppText>
          )}

          <View style={styles.tagContainer}>
            <View style={styles.roleTag}>
              <AppText style={styles.roleTagText}>
                {profileData.role || "Family Member"}
              </AppText>
            </View>
          </View>

          {/* Only show Message button if it's not the user's own profile */}
          {currentUser?._id !== profileData._id && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleSendMessage}
              activeOpacity={0.8}
            >
              <Mail size={18} color="#111827" />
              <AppText style={styles.messageButtonText}>Send Message</AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Personal Details - Logic: Render ONLY if items are visible/available in data */}
        <View style={styles.infoSection}>
          <AppText type="bold" style={styles.sectionTitle}>
            Personal Details
          </AppText>

          {profileData.email && (
            <DetailItem
              icon={<Mail size={18} color="#6B7280" />}
              label="Email Address"
              value={profileData.email}
            />
          )}

          {profileData.phone && (
            <DetailItem
              icon={<Phone size={18} color="#6B7280" />}
              label="Phone Number"
              value={profileData.phone}
            />
          )}

          {profileData.dateOfBirth && (
            <DetailItem
              icon={<Cake size={18} color="#6B7280" />}
              label="Date of Birth"
              value={profileData.dateOfBirth}
            />
          )}

          <DetailItem
            icon={<Shield size={18} color="#6B7280" />}
            label="Account Status"
            value={
              profileData.isVerified ? "Verified Member" : "Standard Member"
            }
            valueStyle={{
              color: profileData.isVerified ? "#10B981" : "#1F2937",
            }}
          />

          {profileData.createdAt && (
            <DetailItem
              icon={<Calendar size={18} color="#6B7280" />}
              label="Member Since"
              value={new Date(profileData.createdAt).toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  year: "numeric",
                  day: "numeric",
                }
              )}
            />
          )}
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <View style={styles.idBox}>
            <Info size={14} color="#9CA3AF" />
            <AppText style={styles.idText}>
              System ID: {profileData._id}
            </AppText>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Detail Row Component
const DetailItem = ({ icon, label, value, valueStyle }: any) => (
  <View style={styles.infoRow}>
    <View style={styles.iconCircle}>{icon}</View>
    <View style={styles.infoTextContainer}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText type="medium" style={[styles.infoValue, valueStyle || {}]}>
        {value}
      </AppText>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, color: "#111827", fontWeight: "700" },
  backBtn: { padding: 8 },
  profileHero: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  avatarContainer: { marginBottom: 20, position: "relative" },
  avatarOuterBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: PRIMARY_YELLOW_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    elevation: 6,
    shadowColor: PRIMARY_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileImage: { width: 110, height: 110, borderRadius: 55 },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: PRIMARY_YELLOW_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 42,
    color: PRIMARY_YELLOW_DARK,
    fontWeight: "bold",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 2,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  userName: {
    fontSize: 26,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 6,
  },
  userBio: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  tagContainer: { marginBottom: 20 },
  roleTag: {
    backgroundColor: PRIMARY_YELLOW_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleTagText: { fontSize: 13, color: PRIMARY_YELLOW_DARK, fontWeight: "600" },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_YELLOW,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 16,
    gap: 10,
    elevation: 6,
    shadowColor: PRIMARY_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  messageButtonText: { color: "#111827", fontSize: 16, fontWeight: "700" },
  infoSection: { paddingHorizontal: 24, paddingTop: 12 },
  sectionTitle: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 20,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  infoValue: { fontSize: 16, color: "#111827", fontWeight: "500" },
  footerInfo: { paddingHorizontal: 24, marginTop: 20, marginBottom: 40 },
  idBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  idText: { fontSize: 12, color: "#9CA3AF", letterSpacing: 0.3 },
});

export default UserProfilePage;
