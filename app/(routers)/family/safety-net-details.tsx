import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  PlayCircle,
  FileAudio,
  Lock,
  Unlock,
  Calendar,
  Trash2,
  Info,
  Mail,
  User as UserIcon,
  Video,
  X,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  deleteSafetyNet,
  getSafetyNetById,
  clearSelectedNet,
} from "@/src/redux/slices/safetyNet";

const { width, height } = Dimensions.get("window");

const SafetyNetDetails = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Get item from params (initial data)
  const { item } = useLocalSearchParams<{ item: string }>();
  const initialData = item ? JSON.parse(item) : null;

  // Get fresh data from Redux
  const {
    selectedNet: data,
    loading,
    isSubmitting,
  } = useSelector((state: RootState) => state.safetyNet);
  const { user: currentUser } = useSelector((state: RootState) => state.user);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // 1. FETCH FRESH DATA BY ID ON MOUNT
  useEffect(() => {
    if (initialData?._id) {
      dispatch(getSafetyNetById(initialData._id))
        .unwrap()
        .then((res) => {
          console.log(
            "✅ [FETCH SUCCESS] Vault Details:",
            JSON.stringify(res, null, 2)
          );
        })
        .catch((err) => console.error("❌ [FETCH ERROR]:", err));
    }

    return () => {
      dispatch(clearSelectedNet());
    };
  }, [initialData?._id]);

  // Use fresh data if available, otherwise fallback to initial data from params
  const activeData = data || initialData;

  if (!activeData && loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
        <AppText style={{ marginTop: 10 }}>Decrypting Vault...</AppText>
      </View>
    );
  }

  if (!activeData) return null;

  const triggerDate = new Date(activeData.triggerDate);
  const isReleased = triggerDate <= new Date();
  const isOwner = activeData.createdBy?._id === currentUser?._id;

  const images = activeData.imageUrls || [];
  const audios = activeData.audioUrls || [];
  const videos = activeData.videoUrls || [];

  const handleDelete = async () => {
    try {
      await dispatch(deleteSafetyNet(activeData._id)).unwrap();
      setDeleteModalVisible(false);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err || "Failed to delete");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Vault Details
        </AppText>
        <View style={styles.headerActions}>
          {isOwner && (
            <TouchableOpacity
              onPress={() => setDeleteModalVisible(true)}
              style={styles.roundBtn}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* HERO STATUS */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.statusIconBox,
              { backgroundColor: isReleased ? "#D1FAE5" : "#FEF3C7" },
            ]}
          >
            {isReleased ? (
              <Unlock size={32} color="#10B981" />
            ) : (
              <Lock size={32} color="#D97706" />
            )}
          </View>
          <AppText type="bold" style={styles.mainTitle}>
            {activeData.title}
          </AppText>
          <View style={styles.badgeRow}>
            <View style={styles.timeBadge}>
              <Calendar size={14} color="#6B7280" />
              <AppText style={styles.badgeText}>
                {triggerDate.toLocaleDateString()} at{" "}
                {triggerDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </AppText>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isReleased ? "#10B981" : "#F59E0B" },
              ]}
            >
              <AppText style={styles.statusBadgeText}>
                {isReleased ? "RELEASED" : "LOCKED"}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* DESCRIPTION (Legacy Message) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Info size={18} color="#4F46E5" />
              <AppText type="bold" style={styles.cardLabel}>
                LEGACY MESSAGE
              </AppText>
            </View>
            <AppText style={styles.descriptionText}>
              {activeData.description ||
                "No specific instructions provided for this vault."}
            </AppText>
          </View>

          <AppText type="bold" style={styles.sectionTitle}>
            Vault Contents
          </AppText>

          {isReleased ? (
            <View>
              {/* IMAGES */}
              {images.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                  <AppText style={styles.mediaLabel}>Photos</AppText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageScroll}
                  >
                    {images.map((url: string, i: number) => (
                      <TouchableOpacity
                        key={`img-${i}`}
                        onPress={() => setSelectedImage(url)}
                      >
                        <Image
                          source={{ uri: url }}
                          style={styles.mediaImage}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* AUDIOS */}
              {audios.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                  <AppText style={styles.mediaLabel}>Audio Recordings</AppText>
                  {audios.map((url: string, i: number) => (
                    <TouchableOpacity
                      key={`aud-${i}`}
                      style={styles.mediaRow}
                      onPress={() => Linking.openURL(url)}
                    >
                      <View
                        style={[
                          styles.mediaIconCircle,
                          { backgroundColor: "#F5F3FF" },
                        ]}
                      >
                        <FileAudio size={20} color="#8B5CF6" />
                      </View>
                      <AppText style={styles.mediaName}>
                        Voice Note {i + 1}
                      </AppText>
                      <PlayCircle size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* VIDEOS */}
              {videos.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                  <AppText style={styles.mediaLabel}>Videos</AppText>
                  {videos.map((url: string, i: number) => (
                    <TouchableOpacity
                      key={`vid-${i}`}
                      style={styles.mediaRow}
                      onPress={() => Linking.openURL(url)}
                    >
                      <View
                        style={[
                          styles.mediaIconCircle,
                          { backgroundColor: "#FEF2F2" },
                        ]}
                      >
                        <Video size={20} color="#EF4444" />
                      </View>
                      <AppText style={styles.mediaName}>
                        Video Message {i + 1}
                      </AppText>
                      <PlayCircle size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.lockedState}>
              <Lock size={30} color="#94A3B8" />
              <AppText style={styles.lockedText}>
                Media files are encrypted until the trigger date.
              </AppText>
            </View>
          )}

          {/* BENEFICIARIES */}
          <AppText type="bold" style={[styles.sectionTitle, { marginTop: 25 }]}>
            Assigned Beneficiaries
          </AppText>
          <View style={styles.assignedContainer}>
            {activeData.assignedUsers?.length > 0 ? (
              activeData.assignedUsers.map((user: any, index: number) => (
                <View key={user._id || index} style={styles.userFullCard}>
                  <View style={styles.userCardHeader}>
                    <View style={styles.avatarContainer}>
                      {user.profilePicture ? (
                        <Image
                          source={{ uri: user.profilePicture }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <UserIcon size={20} color="#64748B" />
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <AppText type="bold" style={styles.userNameText}>
                        {user.firstName} {user.lastName}
                      </AppText>
                      <View style={styles.emailRow}>
                        <Mail size={12} color="#94A3B8" />
                        <AppText style={styles.userEmailText}>
                          {user.email}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <AppText style={styles.noUsersText}>
                No beneficiaries assigned.
              </AppText>
            )}
          </View>
        </View>
      </ScrollView>

      {/* DELETE MODAL & IMAGE ZOOM (Unchanged) */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity
            style={styles.closeZoomBtn}
            onPress={() => setSelectedImage(null)}
          >
            <X size={32} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIcon}>
              <Trash2 size={28} color="#EF4444" />
            </View>
            <AppText type="bold" style={styles.modalTitle}>
              Delete this Vault?
            </AppText>
            <AppText style={styles.modalSub}>This action is permanent.</AppText>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <AppText>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <AppText style={{ color: "#FFF" }}>Confirm</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 16, color: "#111827" },
  headerActions: { flexDirection: "row", gap: 8 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  statusIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 10,
  },
  mainTitle: {
    fontSize: 22,
    color: "#111827",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, color: "#FFF", fontWeight: "bold" },
  body: { padding: 20 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 11,
    color: "#4F46E5",
    letterSpacing: 1,
    fontWeight: "700",
  },
  descriptionText: { fontSize: 15, color: "#475569", lineHeight: 22 },
  sectionTitle: {
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 15,
    fontWeight: "700",
  },
  mediaLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  imageScroll: { marginBottom: 15 },
  mediaImage: {
    width: 130,
    height: 130,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  mediaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mediaName: { flex: 1, fontSize: 14, color: "#334155", fontWeight: "500" },
  lockedState: {
    alignItems: "center",
    padding: 35,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  lockedText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  assignedContainer: { gap: 12 },
  userFullCard: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  userCardHeader: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  userInfo: { flex: 1, marginLeft: 12 },
  userNameText: { fontSize: 15, color: "#1E293B", fontWeight: "600" },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  userEmailText: { fontSize: 12, color: "#64748B" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  closeZoomBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
    padding: 10,
  },
  zoomedImage: { width: width, height: height * 0.8 },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  warningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, color: "#111827", marginBottom: 8 },
  modalSub: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 24,
    fontSize: 14,
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  deleteBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#EF4444",
  },
});

export default SafetyNetDetails;
