import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
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
import { AppDispatch } from "@/src/redux/store";
import { fetchUserById } from "@/src/redux/slices/userSlice";

const UserProfilePage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const result = await dispatch(fetchUserById(id as string)).unwrap();
      setProfile(result);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EAB308" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <AppText>User not found</AppText>
      </View>
    );
  }

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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHero}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <AppText style={styles.avatarInitial}>
                {profile.firstName?.charAt(0)}
              </AppText>
            </View>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={20} color="#3B82F6" fill="#FFF" />
              </View>
            )}
          </View>

          <AppText type="bold" style={styles.userName}>
            {profile.firstName} {profile.lastName}
          </AppText>

          {profile.bio && (
            <AppText style={styles.userBio}>"{profile.bio}"</AppText>
          )}

          <View style={styles.tagContainer}>
            <View style={styles.roleTag}>
              <AppText style={styles.roleTagText}>Family Member</AppText>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.infoSection}>
          <AppText type="bold" style={styles.sectionTitle}>
            Personal Details
          </AppText>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Mail size={18} color="#6B7280" />
            </View>
            <View>
              <AppText style={styles.infoLabel}>Email Address</AppText>
              <AppText type="medium" style={styles.infoValue}>
                {profile.email}
              </AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Phone size={18} color="#6B7280" />
            </View>
            <View>
              <AppText style={styles.infoLabel}>Phone Number</AppText>
              <AppText type="medium" style={styles.infoValue}>
                {profile.phone || "Not provided"}
              </AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Cake size={18} color="#6B7280" />
            </View>
            <View>
              <AppText style={styles.infoLabel}>Date of Birth</AppText>
              <AppText type="medium" style={styles.infoValue}>
                {profile.dateOfBirth || "Not set"}
              </AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Shield size={18} color="#6B7280" />
            </View>
            <View>
              <AppText style={styles.infoLabel}>Account Status</AppText>
              <AppText
                type="medium"
                style={[
                  styles.infoValue,
                  { color: profile.isVerified ? "#10B981" : "#6B7280" },
                ]}
              >
                {profile.isVerified ? "Verified User" : "Standard User"}
              </AppText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Calendar size={18} color="#6B7280" />
            </View>
            <View>
              <AppText style={styles.infoLabel}>Member Since</AppText>
              <AppText type="medium" style={styles.infoValue}>
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                  day: "numeric",
                })}
              </AppText>
            </View>
          </View>
        </View>

        {/* Technical Info */}
        <View style={[styles.infoSection, { marginTop: 0, paddingTop: 0 }]}>
          <View style={styles.idBox}>
            <Info size={14} color="#9CA3AF" />
            <AppText style={styles.idText}>
              User Reference: {profile._id}
            </AppText>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF7" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 60,
  },
  headerTitle: { fontSize: 18 },
  backBtn: { padding: 8, marginLeft: -8 },
  profileHero: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: {
    marginBottom: 15,
    position: "relative",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarInitial: { fontSize: 40, color: "#FFF", fontWeight: "bold" },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  userName: { fontSize: 22, color: "#111827" },
  userBio: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
    paddingHorizontal: 40,
    textAlign: "center",
  },
  tagContainer: { marginTop: 12 },
  roleTag: {
    backgroundColor: "#FEFCE8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FEF08A",
  },
  roleTagText: { fontSize: 12, color: "#A16207", fontWeight: "600" },
  infoSection: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 16, marginBottom: 20, color: "#374151" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoLabel: { fontSize: 12, color: "#9CA3AF" },
  infoValue: { fontSize: 15, color: "#1F2937" },
  idBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  idText: { fontSize: 11, color: "#9CA3AF" },
});

export default UserProfilePage;
