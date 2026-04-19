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
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import {
  User as UserIcon,
  Phone,
  Calendar,
  Bell,
  LogOut,
  CheckCircle2,
  Edit3,
  Eye,
  X,
  ShieldCheck,
  Wallet,
  LifeBuoy,
  ChevronRight,
  Camera,
  Database,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { AppText } from "@/src/ui/AppText";
import {
  updateUserProfile,
  updateNotificationSettings,
  fetchUserProfile,
  updateProfilePicture,
} from "@/src/redux/slices/userSlice";
import { removeAuthToken } from "@/src/redux/services/secureStore";
import { router } from "expo-router";

// Define strict types to fix ts(7053)
type UserCategory = "privacySettings" | "notificationPreferences";

interface CacheItem {
  key: string;
  size: number;
  label: string;
}

const ProfilePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.user);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStorageModalVisible, setIsStorageModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [cacheItems, setCacheItems] = useState<CacheItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchUserProfile());
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    calculateStorage();
  }, [dispatch]);

  const calculateStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const processed = items.map(([key, value]) => ({
        key,
        size: value ? new Blob([value]).size : 0,
        label: key.startsWith("messages_")
          ? `Chat: ${key.replace("messages_", "")}`
          : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      }));
      setCacheItems(processed);
    } catch (e) {
      console.error(e);
    }
  };

  const initials = `${user?.firstName?.charAt(0) || ""}${
    user?.lastName?.charAt(0) || ""
  }`.toUpperCase();

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Permission Denied", "Gallery access required.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setUploadingPhoto(true);
      try {
        await dispatch(
          updateProfilePicture({
            uri: result.assets[0].uri,
            name: result.assets[0].fileName || "profile.jpg",
            type: result.assets[0].mimeType || "image/jpeg",
          })
        ).unwrap();
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await removeAuthToken();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  // Fixed indexing error ts(7053) by providing specific types
  const handleToggle = async (category: UserCategory, field: string) => {
    if (!user) return;
    const currentCategorySettings = user[category] as Record<string, any>;
    const updatedData = {
      [category]: {
        ...currentCategorySettings,
        [field]: !currentCategorySettings[field],
      },
    };
    try {
      await dispatch(updateNotificationSettings(updatedData)).unwrap();
    } catch (err: any) {
      Alert.alert("Error", err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const deleteSelected = async () => {
    Alert.alert(
      "Clear Cache",
      `Delete ${selectedKeys.length} items permanently?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await AsyncStorage.multiRemove(selectedKeys);
              await calculateStorage();
              setSelectedKeys([]);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim }}
      >
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingPhoto}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarMain}>
              {user?.profilePicture ? (
                <Image
                  source={{ uri: user.profilePicture }}
                  style={styles.profileImg}
                />
              ) : (
                <AppText type="bold" style={styles.initialsText}>
                  {initials || "??"}
                </AppText>
              )}
            </View>
            <View style={styles.cameraBtn}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Camera size={12} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.infoBox}>
            <View style={styles.rowCenter}>
              <AppText type="bold" style={styles.nameLabel}>
                {user?.firstName} {user?.lastName}
              </AppText>
              {user?.isVerified && <CheckCircle2 size={18} color="#10B981" />}
            </View>
            <AppText style={styles.emailLabel}>{user?.email}</AppText>
          </View>
        </View>

        {/* Account Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={styles.sectionTitle}>
              Account Details
            </AppText>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(true)}
              style={styles.pillBtn}
            >
              <Edit3 size={14} color="#D97706" />
              <AppText style={styles.pillBtnText}>Edit</AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.mainCard}>
            <DetailItem
              icon={<UserIcon size={18} color="#94A3B8" />}
              label="Identity"
              value={`${user?.firstName} ${user?.lastName}`}
            />
            <DetailItem
              icon={<Phone size={18} color="#94A3B8" />}
              label="Phone Number"
              value={user?.phone || "Not linked"}
            />
            <DetailItem
              icon={<Calendar size={18} color="#94A3B8" />}
              label="Birthday"
              value={user?.dateOfBirth || "Not set"}
              isLast
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <AppText type="bold" style={styles.sectionTitle}>
            Preferences
          </AppText>
          <View style={styles.mainCard}>
            <ToggleItem
              icon={<Eye size={20} color="#F59E0B" />}
              title="Public Name"
              desc="Show name on public donations"
              value={!!user?.privacySettings?.showNameInDonations}
              onToggle={() =>
                handleToggle("privacySettings", "showNameInDonations")
              }
            />

            <ToggleItem
              icon={<ShieldCheck size={20} color="#F59E0B" />}
              title="Contact Privacy"
              desc="Show phone to family members"
              value={!!user?.privacySettings?.showContactDetailsToFamily}
              onToggle={() =>
                handleToggle("privacySettings", "showContactDetailsToFamily")
              }
            />

            {/* Storage Tab */}
            <TouchableOpacity
              style={styles.storageTab}
              onPress={() => {
                calculateStorage();
                setIsStorageModalVisible(true);
              }}
            >
              <View style={styles.toggleIconBox}>
                <Database size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <AppText type="bold" style={styles.toggleTitle}>
                  Storage & Cache
                </AppText>
                <AppText style={styles.toggleDesc}>Manage offline data</AppText>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <ToggleItem
              icon={<Bell size={20} color="#F59E0B" />}
              title="Donations"
              desc="Alerts for contributions"
              value={!!user?.notificationPreferences?.donationNotifications}
              onToggle={() =>
                handleToggle("notificationPreferences", "donationNotifications")
              }
            />

            <ToggleItem
              icon={<Wallet size={20} color="#F59E0B" />}
              title="Withdrawals"
              desc="Alerts for fund usage"
              value={!!user?.notificationPreferences?.withdrawalNotifications}
              onToggle={() =>
                handleToggle(
                  "notificationPreferences",
                  "withdrawalNotifications"
                )
              }
              isLast
            />
          </View>
        </View>

        {/* Support */}
        <TouchableOpacity
          style={styles.supportCard}
          onPress={() => router.push("/(routers)/profile/support")}
        >
          <View style={styles.rowCenter}>
            <View style={styles.iconCircle}>
              <LifeBuoy size={20} color="#F59E0B" />
            </View>
            <AppText type="medium" style={styles.supportLabel}>
              Support & Help Center
            </AppText>
          </View>
          <ChevronRight size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <AppText style={styles.logoutText}>Logout of Account</AppText>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* STORAGE MODAL */}
      <Modal
        visible={isStorageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsStorageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsStorageModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <X size={22} color="#1E293B" />
            </TouchableOpacity>
            <AppText type="bold" style={styles.modalTitle}>
              Storage Manager
            </AppText>
            <TouchableOpacity
              onPress={() =>
                setSelectedKeys(
                  selectedKeys.length === cacheItems.length
                    ? []
                    : cacheItems.map((i) => i.key)
                )
              }
              style={styles.modalSaveBtn}
            >
              <AppText style={styles.modalSaveText}>
                {selectedKeys.length === cacheItems.length
                  ? "Deselect"
                  : "Select All"}
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.storageList}>
            <View style={styles.storageHeader}>
              <AppText style={styles.totalSizeLabel}>
                TOTAL LOCAL FOOTPRINT
              </AppText>
              <AppText type="bold" style={styles.totalSizeValue}>
                {formatSize(
                  cacheItems.reduce((acc, curr) => acc + curr.size, 0)
                )}
              </AppText>
            </View>
            {cacheItems.map((item) => (
              <Pressable
                key={item.key}
                style={styles.cacheRow}
                onPress={() =>
                  setSelectedKeys((prev) =>
                    prev.includes(item.key)
                      ? prev.filter((k) => k !== item.key)
                      : [...prev, item.key]
                  )
                }
              >
                <View style={styles.rowCenter}>
                  {selectedKeys.includes(item.key) ? (
                    <CheckSquare size={22} color="#F59E0B" />
                  ) : (
                    <Square size={22} color="#94A3B8" />
                  )}
                  <View style={{ marginLeft: 15 }}>
                    <AppText type="bold" style={styles.itemLabel}>
                      {item.label}
                    </AppText>
                    <AppText style={styles.itemSize}>
                      {formatSize(item.size)}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          {selectedKeys.length > 0 && (
            <View style={styles.deleteBottomBar}>
              <TouchableOpacity
                style={styles.deleteActionBtn}
                onPress={deleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Trash2 size={20} color="#FFF" />
                    <AppText style={styles.deleteActionText}>
                      Clear {selectedKeys.length} Items
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        user={user}
        loading={loading}
      />
    </SafeAreaView>
  );
};

// --- EDIT MODAL ---
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
    if (user && visible)
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        dateOfBirth: user.dateOfBirth || "",
        bio: user.bio || "",
      });
  }, [user, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <X size={22} color="#1E293B" />
          </TouchableOpacity>
          <AppText type="bold" style={styles.modalTitle}>
            Edit Profile
          </AppText>
          <TouchableOpacity
            onPress={() => {
              dispatch(updateUserProfile(form)).unwrap().then(onClose);
            }}
            style={styles.modalSaveBtn}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#D97706" />
            ) : (
              <AppText type="bold" style={styles.modalSaveText}>
                Save
              </AppText>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.inputGroup}>
            <AppText style={styles.inputLabel}>First Name</AppText>
            <TextInput
              style={styles.modalInput}
              value={form.firstName}
              onChangeText={(t) => setForm({ ...form, firstName: t })}
            />
          </View>
          <View style={styles.inputGroup}>
            <AppText style={styles.inputLabel}>Last Name</AppText>
            <TextInput
              style={styles.modalInput}
              value={form.lastName}
              onChangeText={(t) => setForm({ ...form, lastName: t })}
            />
          </View>
          <View style={styles.inputGroup}>
            <AppText style={styles.inputLabel}>Date of Birth</AppText>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.datePickerTrigger}
            >
              <AppText>{form.dateOfBirth || "Select birthday"}</AppText>
              <Calendar size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="spinner"
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
          <View style={styles.inputGroup}>
            <AppText style={styles.inputLabel}>Bio</AppText>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={form.bio}
              multiline
              onChangeText={(t) => setForm({ ...form, bio: t })}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// --- HELPER ITEMS ---
const DetailItem = ({ icon, label, value, isLast }: any) => (
  <View style={[styles.detailItem, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.detailIcon}>{icon}</View>
    <View>
      <AppText style={styles.detailLabel}>{label}</AppText>
      <AppText style={styles.detailValue}>{value}</AppText>
    </View>
  </View>
);

const ToggleItem = ({ icon, title, desc, value, onToggle, isLast }: any) => (
  <View style={[styles.toggleItem, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.toggleTextContent}>
      <View style={styles.toggleIconBox}>{icon}</View>
      <View style={{ flex: 1 }}>
        <AppText type="bold" style={styles.toggleTitle}>
          {title}
        </AppText>
        <AppText style={styles.toggleDesc}>{desc}</AppText>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#E2E8F0", true: "#FDE68A" }}
      thumbColor={value ? "#F59E0B" : "#94A3B8"}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 60, paddingTop: 10 },
  headerCard: { alignItems: "center", marginBottom: 25 },
  avatarWrapper: { position: "relative", marginBottom: 15 },
  avatarMain: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF",
    borderWidth: 4,
    borderColor: "#FFF",
    shadowOpacity: 0.1,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileImg: { width: "100%", height: "100%" },
  initialsText: { fontSize: 36, color: "#F59E0B" },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#D97706",
    padding: 6,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#F8FAFC",
  },
  infoBox: { alignItems: "center" },
  nameLabel: { fontSize: 24, color: "#0F172A" },
  emailLabel: { fontSize: 14, color: "#64748B", marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  mainCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    elevation: 2,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  pillBtnText: { color: "#D97706", fontWeight: "700", fontSize: 13 },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 15,
  },
  detailIcon: { backgroundColor: "#F8FAFC", padding: 10, borderRadius: 12 },
  detailLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700" },
  detailValue: { fontSize: 15, color: "#1E293B" },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  toggleTextContent: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    gap: 15,
  },
  toggleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleTitle: { fontSize: 15, color: "#1E293B" },
  toggleDesc: { fontSize: 12, color: "#64748B" },
  storageTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  supportCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowOpacity: 0.04,
    elevation: 2,
  },
  iconCircle: {
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 10,
    marginRight: 12,
  },
  supportLabel: { fontSize: 15, color: "#1E293B" },
  logoutBtn: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 30,
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 100,
  },
  logoutText: { color: "#EF4444", fontWeight: "700", fontSize: 16 },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  modalContainer: { flex: 1, backgroundColor: "#FFF" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalCloseBtn: { padding: 8 },
  modalTitle: { fontSize: 18, color: "#1E293B" },
  modalSaveBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  modalSaveText: { color: "#D97706", fontSize: 16, fontWeight: "700" },
  storageList: { padding: 20 },
  storageHeader: {
    backgroundColor: "#F8FAFC",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  totalSizeLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "800" },
  totalSizeValue: { fontSize: 28, color: "#1E293B", marginTop: 4 },
  cacheRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  itemLabel: { fontSize: 15, color: "#1E293B" },
  itemSize: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  deleteBottomBar: {
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  deleteActionBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    padding: 18,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  deleteActionText: { color: "#FFF", fontWeight: "700" },
  modalScroll: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  datePickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textArea: { height: 100, textAlignVertical: "top" },
});

export default ProfilePage;
