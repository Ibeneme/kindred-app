import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  User,
  Phone,
  Calendar,
  Bell,
  LogOut,
  CheckCircle2,
  Edit3,
  AlignLeft,
  Eye,
  Wallet,
  X,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  updateUserProfile,
  updateNotificationSettings,
  clearUserError,
  fetchUserProfile,
} from "@/src/redux/slices/userSlice";
import { removeAuthToken } from "@/src/redux/services/secureStore";
import { router } from "expo-router";

// --- MAIN PROFILE PAGE ---

const ProfilePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.user);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(fetchUserProfile());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [dispatch]);

  const initials = `${user?.firstName?.charAt(0) || ""}${
    user?.lastName?.charAt(0) || ""
  }`.toUpperCase();

  const handleToggle = async (
    category: "privacySettings" | "notificationPreferences",
    field: string
  ) => {
    const currentSettings = user?.[category] || {};
    const updatedData = {
      [category]: {
        ...currentSettings,
        [field]: !currentSettings[field as keyof typeof currentSettings],
      },
    };
    try {
      await dispatch(updateNotificationSettings(updatedData)).unwrap();
    } catch (err: any) {
      Alert.alert("Update Failed", err || "Could not update setting.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim }}
      >
        {/* Hero Header */}
        <View style={styles.heroHeader}>
          <View style={styles.avatarBackground}>
            <AppText type="bold" style={styles.avatarInitials}>
              {initials || "??"}
            </AppText>
          </View>
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <AppText type="bold" style={styles.fullName}>
                {user?.firstName} {user?.lastName}
              </AppText>
              {user?.isVerified && (
                <CheckCircle2 size={20} color="#10B981" strokeWidth={3} />
              )}
            </View>
            <AppText style={styles.emailText}>{user?.email}</AppText>
          </View>
        </View>

        {/* Account Display Card */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AppText type="bold" style={styles.cardTitle}>
                Account Details
              </AppText>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(true)}
                style={styles.editButton}
              >
                <Edit3 size={16} color="#FFF" />
                <AppText style={styles.editButtonText}>Edit</AppText>
              </TouchableOpacity>
            </View>

            <DetailRow
              icon={<User size={18} color="#6B7280" />}
              label="Full Name"
              value={`${user?.firstName || ""} ${user?.lastName || ""}`}
            />
            <View style={styles.divider} />
            <DetailRow
              icon={<Phone size={18} color="#6B7280" />}
              label="Phone"
              value={user?.phone || "Not set"}
            />
            <View style={styles.divider} />
            <DetailRow
              icon={<Calendar size={18} color="#6B7280" />}
              label="Birthday"
              value={user?.dateOfBirth || "Not set"}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.cardContainer}>
          <AppText type="bold" style={styles.sectionHeading}>
            Preferences
          </AppText>
          <View style={styles.card}>
            <ToggleRow
              icon={<Eye size={18} color="#F59E0B" />}
              label="Show name"
              description="Visibility in donations"
              value={!!user?.privacySettings?.showNameInDonations}
              onToggle={() =>
                handleToggle("privacySettings", "showNameInDonations")
              }
            />
            <View style={styles.divider} />
            <ToggleRow
              icon={<Bell size={18} color="#F59E0B" />}
              label="Donations"
              description="Alerts for family donations"
              value={!!user?.notificationPreferences?.donationNotifications}
              onToggle={() =>
                handleToggle("notificationPreferences", "donationNotifications")
              }
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            removeAuthToken();
            router.replace("/(auth)/sign-in");
          }}
        >
          <LogOut size={20} color="#EF4444" />
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Edit Profile Modal (PageSheet) */}
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        user={user}
        loading={loading}
      />
    </SafeAreaView>
  );
};

// --- MODAL COMPONENT ---

const EditProfileModal = ({ visible, onClose, user, loading }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    bio: "",
  });

  useEffect(() => {
    if (user && visible) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        dateOfBirth: user.dateOfBirth || "",
        bio: user.bio || "",
      });
    }
  }, [user, visible]);

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return Alert.alert("Required", "First and last names are required.");
    }

    // Logic using .unwrap(), .then(), and .catch()
    dispatch(updateUserProfile(form))
      .unwrap()
      .then(() => {
        Alert.alert("Success", "Profile updated successfully!");
        onClose(); // Close modal on success
      })
      .catch((err) => {
        Alert.alert("Update Failed", err || "Something went wrong.");
      });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Modal Top Bar */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.headerAction}>
            <X size={24} color="#111827" />
          </TouchableOpacity>
          <AppText type="bold" style={styles.modalTitle}>
            Edit Profile
          </AppText>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={styles.headerAction}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#F59E0B" />
            ) : (
              <AppText type="bold" style={{ color: "#F59E0B", fontSize: 16 }}>
                Save
              </AppText>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          >
            <InputField
              label="First Name"
              value={form.firstName}
              onChangeText={(t: string) => setForm({ ...form, firstName: t })}
              placeholder="Enter first name"
            />
            <InputField
              label="Last Name"
              value={form.lastName}
              onChangeText={(t: string) => setForm({ ...form, lastName: t })}
              placeholder="Enter last name"
            />
            <InputField
              label="Phone Number"
              value={form.phone}
              keyboardType="phone-pad"
              onChangeText={(t: string) => setForm({ ...form, phone: t })}
              placeholder="Enter phone number"
            />

            <AppText style={styles.inputLabel}>Date of Birth</AppText>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.modalDateInput}
            >
              <AppText
                style={{ color: form.dateOfBirth ? "#111827" : "#9CA3AF" }}
              >
                {form.dateOfBirth || "Select Date of Birth"}
              </AppText>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={
                  form.dateOfBirth ? new Date(form.dateOfBirth) : new Date()
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d)
                    setForm({
                      ...form,
                      dateOfBirth: d.toISOString().split("T")[0],
                    });
                }}
              />
            )}

            <InputField
              label="Bio"
              value={form.bio}
              multiline
              numberOfLines={4}
              onChangeText={(t: string) => setForm({ ...form, bio: t })}
              placeholder="Tell us about yourself..."
              style={[
                styles.modalInput,
                { height: 100, textAlignVertical: "top" },
              ]}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// --- SMALLER COMPONENTS ---

const DetailRow = ({ icon, label, value }: any) => (
  <View style={styles.fieldRow}>
    {icon}
    <View>
      <AppText style={{ fontSize: 12, color: "#6B7280" }}>{label}</AppText>
      <AppText style={{ fontSize: 15, color: "#111827" }}>{value}</AppText>
    </View>
  </View>
);

const InputField = ({ label, style, ...props }: any) => (
  <View style={{ marginBottom: 18 }}>
    <AppText style={styles.inputLabel}>{label}</AppText>
    <TextInput
      style={[styles.modalInput, style]}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  </View>
);

const ToggleRow = ({ icon, label, description, value, onToggle }: any) => (
  <View style={styles.toggleContainer}>
    <View style={styles.toggleLeft}>
      {icon}
      <View style={{ flex: 1, paddingRight: 10 }}>
        <AppText type="bold" style={styles.toggleLabel}>
          {label}
        </AppText>
        <AppText style={styles.toggleDesc}>{description}</AppText>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#E5E7EB", true: "#FDE68A" }}
      thumbColor={value ? "#F59E0B" : "#D1D5DB"}
    />
  </View>
);

// --- STYLES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 40 },
  heroHeader: { alignItems: "center", paddingTop: 20, paddingBottom: 24 },
  avatarBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FBBF24",
  },
  avatarInitials: { fontSize: 32, color: "#D97706" },
  nameSection: { alignItems: "center", marginTop: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fullName: { fontSize: 22, color: "#111827" },
  emailText: { fontSize: 14, color: "#6B7280" },
  cardContainer: { paddingHorizontal: 16, marginTop: 20 },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: { fontSize: 16, color: "#111827" },
  editButton: {
    flexDirection: "row",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    gap: 4,
  },
  editButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: "#EEE" },
  sectionHeading: {
    fontSize: 17,
    color: "#111827",
    marginBottom: 10,
    paddingLeft: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  toggleLeft: { flexDirection: "row", flex: 1, gap: 12, alignItems: "center" },
  toggleLabel: { fontSize: 14, color: "#111827" },
  toggleDesc: { fontSize: 12, color: "#6B7280" },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 30,
    paddingVertical: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
  },
  signOutText: { color: "#EF4444", fontSize: 16, fontWeight: "600" },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#FFF" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerAction: { minWidth: 50 },
  modalTitle: { fontSize: 18, color: "#111827" },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16, // Requested Padding
    paddingVertical: 14, // Requested Padding
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalDateInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 6,
    fontWeight: "600",
    paddingLeft: 4,
  },
});

export default ProfilePage;
