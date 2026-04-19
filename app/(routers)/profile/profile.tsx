import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
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
  MessageSquare,
  Share2,
} from "lucide-react-native";

import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import { fetchUserById } from "@/src/redux/slices/userSlice";

const { width } = Dimensions.get("window");

const PRIMARY_GOLD = "#EAB308";
const PRIMARY_GOLD_DARK = "#CA8A04";
const SLATE_BG = "#F1F5F9";

const UserProfilePage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        <ActivityIndicator size="large" color={PRIMARY_GOLD} />
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
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Transparent Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <AppText type="bold" style={styles.headerTitle}>
            Profile Details
          </AppText>
          <TouchableOpacity style={styles.headerBtn}>
            <Share2 size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Hero Section - Clean Style */}
          <View style={styles.heroSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarMain}>
                {profileData.profilePicture ? (
                  <Image
                    source={{ uri: profileData.profilePicture }}
                    style={styles.profileImg}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <AppText style={styles.avatarInitial}>{initials}</AppText>
                  </View>
                )}
              </View>
              {profileData.isVerified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={18} color="#FFF" fill="#10B981" />
                </View>
              )}
            </View>

            <View style={styles.nameHeader}>
              <AppText type="bold" style={styles.userName}>
                {profileData.firstName} {profileData.lastName}
              </AppText>
              <View style={styles.statusPill}>
                <View style={styles.onlineDot} />
                <AppText style={styles.statusText}>Available</AppText>
              </View>
            </View>

            <View style={styles.roleTag}>
              <AppText style={styles.roleTagText}>
                {profileData.role || "Family Member"}
              </AppText>
            </View>

            {profileData.bio && (
              <AppText style={styles.userBio}>{profileData.bio}</AppText>
            )}

            {/* Actions Bar */}
            {currentUser?._id !== profileData._id && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.msgBtn}
                  onPress={handleSendMessage}
                >
                  <MessageSquare size={18} color="#FFF" />
                  <AppText type="bold" style={styles.msgBtnText}>
                    Send Message
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.callBtn}>
                  <Phone size={20} color="#1E293B" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info Section - Modern Glass Card */}
          <View style={styles.detailsCard}>
            <DetailItem
              icon={<Mail size={20} color={PRIMARY_GOLD} />}
              label="Email Address"
              value={profileData.email}
            />
            <DetailItem
              icon={<Phone size={20} color={PRIMARY_GOLD} />}
              label="Phone Number"
              value={profileData.phone || "Not shared"}
            />
            <DetailItem
              icon={<Cake size={20} color={PRIMARY_GOLD} />}
              label="Birthday"
              value={profileData.dateOfBirth || "N/A"}
            />
            <DetailItem
              icon={<Shield size={20} color={PRIMARY_GOLD} />}
              label="Verification Status"
              value={
                profileData.isVerified
                  ? "Verified Member"
                  : "Awaiting Verification"
              }
              isVerified={profileData.isVerified}
            />
            <DetailItem
              icon={<Calendar size={20} color={PRIMARY_GOLD} />}
              label="Joined On"
              value={new Date(profileData.createdAt).toLocaleDateString(
                "en-US",
                { month: "long", year: "numeric", day: "numeric" }
              )}
              isLast
            />
          </View>

          {/* System Footer */}
          <View style={styles.systemFooter}>
            <View style={styles.idBadge}>
              <Info size={12} color="#94A3B8" />
              <AppText style={styles.idLabel}>ID: {profileData._id}</AppText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const DetailItem = ({ icon, label, value, isVerified, isLast }: any) => (
  <View style={[styles.detailItem, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.detailIconContainer}>{icon}</View>
    <View style={styles.detailTextContent}>
      <AppText style={styles.detailLabel}>{label}</AppText>
      <AppText
        type="medium"
        style={[styles.detailValue, isVerified && { color: "#10B981" }]}
      >
        {value}
      </AppText>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitle: {
    fontSize: 14,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  heroSection: { alignItems: "center", paddingTop: 20, paddingHorizontal: 20 },
  avatarWrapper: { marginBottom: 20 },
  avatarMain: {
    width: 110,
    height: 110,
    borderRadius: 40,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
    padding: 3,
  },
  profileImg: { width: "100%", height: "100%", borderRadius: 37 },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
    backgroundColor: SLATE_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 40, color: PRIMARY_GOLD, fontWeight: "bold" },
  verifiedBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 2,
  },
  nameHeader: { alignItems: "center", marginBottom: 5 },
  userName: { fontSize: 26, color: "#0F172A", letterSpacing: -0.8 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  statusText: { fontSize: 11, color: "#166534", fontWeight: "700" },
  roleTag: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  roleTagText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  userBio: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    marginTop: 15,
    paddingHorizontal: 25,
    lineHeight: 22,
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 30,
    gap: 12,
    width: "100%",
    paddingHorizontal: 10,
  },
  msgBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  msgBtnText: { color: "#FFF", fontSize: 15 },
  callBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  detailsCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 20,
    marginTop: 35,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailTextContent: { flex: 1 },
  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: "#1E293B",
    marginTop: 2,
    fontWeight: "500",
  },

  systemFooter: { alignItems: "center", marginTop: 30, marginBottom: 20 },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  idLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
});

export default UserProfilePage;
