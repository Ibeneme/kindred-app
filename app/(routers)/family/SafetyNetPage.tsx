import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Plus,
  X,
  ArrowLeft,
  Shield,
  Clock,
  Image as ImageIcon,
  Mic,
  Video,
  Trash2,
  Search,
  Check,
  ChevronDown,
  User,
  Calendar,
  Lock,
  Unlock,
  PlayCircle,
  FileAudio,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  getFamilySafetyNets,
  getAssignedSafetyNets,
  createSafetyNet,
  deleteSafetyNet,
} from "@/src/redux/slices/safetyNet";

const SafetyNetPage = () => {
  const router = useRouter();
  const { familyId, familyName, currentMembers } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
    currentMembers: string;
  }>();

  const dispatch = useDispatch<AppDispatch>();

  const familyMembers = useMemo(() => {
    try {
      return currentMembers ? JSON.parse(currentMembers) : [];
    } catch (e) {
      return [];
    }
  }, [currentMembers]);

  const {
    safetyNets = [],
    assignedNets = [],
    loading,
    isSubmitting,
  } = useSelector((state: RootState) => state.safetyNet);
  const { user } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState<"created" | "assigned">("created");
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userSelectorVisible, setUserSelectorVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); // --- NEW DESCRIPTION STATE ---
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);

  const filteredMembers = useMemo(() => {
    return familyMembers.filter((m: any) =>
      `${m.firstName} ${m.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [familyMembers, searchQuery]);

  const displayData = useMemo(() => {
    return activeTab === "created" ? safetyNets : assignedNets;
  }, [activeTab, safetyNets, assignedNets]);

  const selectedUsersLabel = useMemo(() => {
    if (selectedUsers.length === 0) return "Select Beneficiaries";
    return `${selectedUsers.length} Member(s) Selected`;
  }, [selectedUsers]);

  const fetchData = useCallback(() => {
    if (familyId) {
      dispatch(getFamilySafetyNets(familyId));
      dispatch(getAssignedSafetyNets(familyId));
    }
  }, [familyId, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) {
      if (selectedDate < new Date()) {
        setDate(new Date());
      } else {
        setDate(selectedDate);
      }
    }
  };

  const showMode = (mode: "date" | "time") => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const pickImage = async () => {
    if (images.length >= 4) {
      Alert.alert("Limit Reached", "You can only select up to 4 images.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.6,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 4));
    }
  };

  const pickVideo = async () => {
    if (videos.length >= 4) {
      Alert.alert("Limit Reached", "You can only select up to 4 videos.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setVideos((prev) => [...prev, ...result.assets].slice(0, 4));
    }
  };

  const pickAudio = async () => {
    if (audios.length >= 4) {
      Alert.alert("Limit Reached", "You can only select up to 4 audio files.");
      return;
    }
    let result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      multiple: true,
    });
    if (!result.canceled) {
      setAudios((prev) => [...prev, ...result.assets].slice(0, 4));
    }
  };

  const removeMedia = (type: "image" | "video" | "audio", index: number) => {
    if (type === "image")
      setImages((prev) => prev.filter((_, i) => i !== index));
    if (type === "video")
      setVideos((prev) => prev.filter((_, i) => i !== index));
    if (type === "audio")
      setAudios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title || selectedUsers.length === 0) {
      Alert.alert("Error", "Please provide a title and select beneficiaries.");
      return;
    }
    if (date <= new Date()) {
      Alert.alert("Invalid Date", "Trigger date must be in the future.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description); // --- SEND DESCRIPTION ---
    formData.append("triggerDate", date.toISOString());
    formData.append("assignedUsers", JSON.stringify(selectedUsers));

    images.forEach((img, i) => {
      // @ts-ignore
      formData.append("images", {
        uri: img.uri,
        type: "image/jpeg",
        name: `img_${i}.jpg`,
      });
    });
    audios.forEach((aud, i) => {
      // @ts-ignore
      formData.append("audios", {
        uri: aud.uri,
        type: aud.mimeType || "audio/mpeg",
        name: aud.name || `aud_${i}.mp3`,
      });
    });
    videos.forEach((vid, i) => {
      // @ts-ignore
      formData.append("videos", {
        uri: vid.uri,
        type: "video/mp4",
        name: `vid_${i}.mp4`,
      });
    });

    try {
      await dispatch(
        createSafetyNet({ familyId: familyId!, formData })
      ).unwrap();
      setModalVisible(false);
      resetForm();
      Alert.alert("Success", "Safety Net Vault Secured.");
    } catch (err: any) {
      Alert.alert("Error", err);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription(""); // --- RESET DESCRIPTION ---
    setDate(new Date());
    setSelectedUsers([]);
    setImages([]);
    setAudios([]);
    setVideos([]);
  };

  const renderNetItem = ({ item }: { item: any }) => {
    const isReleased = new Date(item.triggerDate) <= new Date();
    const isOwner = item.createdBy?._id === user?._id;
    const creator = item.createdBy;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/family/safety-net-details",
            params: { item: JSON.stringify(item) },
          })
        }
        style={styles.netCard}
      >
        <View style={styles.netHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isReleased ? "#D1FAE5" : "#FEF3C7" },
            ]}
          >
            {isReleased ? (
              <Unlock size={20} color="#10B981" />
            ) : (
              <Lock size={20} color="#F59E0B" />
            )}
          </View>
          <AppText type="bold" style={styles.netTitle}>
            {item.title}
          </AppText>
          {isOwner && activeTab === "created" && (
            <TouchableOpacity
              onPress={() => dispatch(deleteSafetyNet(item._id))}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailRow}>
          <Clock size={14} color="#6B7280" />
          <AppText style={styles.detailText}>
            {isReleased ? "Released on: " : "Releases: "}
            {new Date(item.triggerDate).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </AppText>
        </View>

        {/* --- CREATOR DETAILS SECTION --- */}
        <View style={styles.creatorFooter}>
          <View style={styles.creatorInfo}>
            {creator?.profilePicture ? (
              <Image
                source={{ uri: creator.profilePicture }}
                style={styles.creatorImage}
              />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <User size={12} color="#9CA3AF" />
              </View>
            )}
            <View>
              <AppText style={styles.creatorLabel}>Vault Creator</AppText>
              <AppText type="bold" style={styles.creatorName}>
                {isOwner ? "You" : `${creator?.firstName} ${creator?.lastName}`}
              </AppText>
            </View>
          </View>

          <View style={styles.mediaCountRow}>
            <View style={styles.mediaTag}>
              <ImageIcon size={10} color="#6B7280" />
              <AppText style={styles.mediaTagText}>
                {item.imageUrls?.length || 0}
              </AppText>
            </View>
            <View style={styles.mediaTag}>
              <Mic size={10} color="#6B7280" />
              <AppText style={styles.mediaTagText}>
                {item.audioUrls?.length || 0}
              </AppText>
            </View>
            <View style={styles.mediaTag}>
              <Video size={10} color="#6B7280" />
              <AppText style={styles.mediaTagText}>
                {item.videoUrls?.length || 0}
              </AppText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <AppText type="bold" style={styles.headerTitle}>
            Safety Net
          </AppText>
          <AppText style={styles.headerSub}>{familyName}</AppText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab("created")}
          style={[styles.tab, activeTab === "created" && styles.activeTab]}
        >
          <AppText
            type="bold"
            style={[
              styles.tabText,
              activeTab === "created" && styles.activeTabText,
            ]}
          >
            My Vaults
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("assigned")}
          style={[styles.tab, activeTab === "assigned" && styles.activeTab]}
        >
          <AppText
            type="bold"
            style={[
              styles.tabText,
              activeTab === "assigned" && styles.activeTabText,
            ]}
          >
            Shared With Me
          </AppText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayData}
        keyExtractor={(item) => item._id}
        renderItem={renderNetItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Shield size={40} color="#D1D5DB" />
            <AppText style={{ color: "#9CA3AF", marginTop: 10 }}>
              {activeTab === "created"
                ? "You haven't created any vaults."
                : "No shared vaults yet."}
            </AppText>
          </View>
        }
      />

      {activeTab === "created" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* CREATE MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
          <View style={styles.modalHeader}>
            <AppText type="bold" style={styles.modalTitle}>
              Setup New Vault
            </AppText>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ padding: 20 }}
          >
            <AppText style={styles.label}>Vault Title *</AppText>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. A message for the future"
              placeholderTextColor="#9CA3AF"
            />

            <AppText style={styles.label}>
              Description (Instructions/Legacy Message)
            </AppText>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: "top" }]} // --- NEW DESCRIPTION INPUT ---
              value={description}
              onChangeText={setDescription}
              placeholder="Write a message or instructions for your beneficiaries..."
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <AppText style={styles.label}>Release Date & Time *</AppText>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeBtn}
                onPress={() => showMode("date")}
              >
                <Calendar size={18} color="#111827" />
                <AppText style={styles.dateTimeText}>
                  {date.toLocaleDateString()}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeBtn}
                onPress={() => showMode("time")}
              >
                <Clock size={18} color="#111827" />
                <AppText style={styles.dateTimeText}>
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </AppText>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode={pickerMode}
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="light"
                onChange={onChangeDate}
                minimumDate={new Date()}
              />
            )}

            <AppText style={styles.label}>
              Multimedia Assets (Max 4 each)
            </AppText>
            <View style={styles.mediaPickerRow}>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
                <ImageIcon size={18} color="#10B981" />
                <AppText style={styles.pickerText}>
                  Images ({images.length}/4)
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickAudio}>
                <Mic size={18} color="#8B5CF6" />
                <AppText style={styles.pickerText}>
                  Audio ({audios.length}/4)
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickVideo}>
                <Video size={18} color="#EF4444" />
                <AppText style={styles.pickerText}>
                  Video ({videos.length}/4)
                </AppText>
              </TouchableOpacity>
            </View>

            {/* MEDIA PREVIEW SECTION */}
            {(images.length > 0 || videos.length > 0 || audios.length > 0) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.previewScroll}
              >
                {images.map((item, index) => (
                  <View key={`img-${index}`} style={styles.previewItem}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.previewMedia}
                    />
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => removeMedia("image", index)}
                    >
                      <X size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {videos.map((item, index) => (
                  <View key={`vid-${index}`} style={styles.previewItem}>
                    <View
                      style={[
                        styles.previewMedia,
                        styles.videoPreviewPlaceholder,
                      ]}
                    >
                      <PlayCircle size={24} color="#FFF" />
                    </View>
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => removeMedia("video", index)}
                    >
                      <X size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {audios.map((item, index) => (
                  <View key={`aud-${index}`} style={styles.previewItem}>
                    <View
                      style={[
                        styles.previewMedia,
                        styles.audioPreviewPlaceholder,
                      ]}
                    >
                      <FileAudio size={24} color="#8B5CF6" />
                      <AppText
                        style={styles.audioPreviewText}
                        numberOfLines={1}
                      >
                        {item.name}
                      </AppText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => removeMedia("audio", index)}
                    >
                      <X size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <AppText style={styles.label}>Assign Beneficiaries *</AppText>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setUserSelectorVisible(true)}
            >
              <AppText
                style={{
                  color: selectedUsers.length > 0 ? "#111827" : "#9CA3AF",
                }}
              >
                {selectedUsersLabel}
              </AppText>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <AppText type="bold" style={{ color: "#FFF", fontSize: 16 }}>
                  Secure Vault
                </AppText>
              )}
            </TouchableOpacity>
            <View style={{ height: 50 }} />
          </ScrollView>
        </SafeAreaView>

        <Modal visible={userSelectorVisible} animationType="fade" transparent>
          <View style={styles.dropdownOverlay}>
            <SafeAreaView style={styles.dropdownContent}>
              <View style={styles.dropdownHeader}>
                <AppText type="bold" style={{ fontSize: 16 }}>
                  Select Beneficiaries
                </AppText>
                <TouchableOpacity onPress={() => setUserSelectorVisible(false)}>
                  <X size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <View style={styles.searchContainer}>
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search members..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => toggleUser(item._id)}
                  >
                    <View style={styles.userAvatar}>
                      <User size={20} color="#6B7280" />
                    </View>
                    <AppText style={styles.userName}>
                      {item.firstName} {item.lastName}
                    </AppText>
                    {selectedUsers.includes(item._id) && (
                      <Check size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setUserSelectorVisible(false)}
              >
                <AppText type="bold" style={{ color: "#FFF" }}>
                  Done
                </AppText>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </Modal>
      </Modal>
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
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 12, color: "#6B7280" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 5,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
    borderColor: "#F3F4F6",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  activeTab: { backgroundColor: "#111827" },
  tabText: { color: "#6B7280", fontSize: 13 },
  activeTabText: { color: "#FFF" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  netCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  netHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  iconContainer: { padding: 8, borderRadius: 12, marginRight: 12 },
  netTitle: { flex: 1, fontSize: 16, color: "#111827" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  creatorFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  creatorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  creatorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  creatorLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 1,
  },
  creatorName: {
    fontSize: 13,
    color: "#111827",
  },
  mediaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  detailText: { fontSize: 13, color: "#6B7280" },
  mediaCountRow: { flexDirection: "row", gap: 8 },
  mediaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mediaTagText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, color: "#111827" },
  label: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 22,
    marginBottom: 10,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  dateTimeContainer: { flexDirection: "row", gap: 12 },
  dateTimeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  dateTimeText: { fontSize: 14, color: "#111827", fontWeight: "500" },
  mediaPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  pickerBtn: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pickerText: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "bold",
  },
  previewScroll: { marginTop: 10, marginBottom: 10 },
  previewItem: { marginRight: 12, position: "relative" },
  previewMedia: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  videoPreviewPlaceholder: {
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  audioPreviewPlaceholder: {
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
  },
  audioPreviewText: {
    fontSize: 8,
    color: "#8B5CF6",
    marginTop: 4,
    width: 70,
    textAlign: "center",
  },
  removeMediaBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWith: 2,
    borderColor: "#FFF",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
  },
  submitBtn: {
    backgroundColor: "#10B981",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 40,
    elevation: 4,
  },
  empty: { alignItems: "center", marginTop: 120 },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dropdownContent: {
    backgroundColor: "#FFF",
    height: "85%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
    fontSize: 15,
    color: "#111827",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  userName: { flex: 1, fontSize: 15, color: "#111827", fontWeight: "500" },
  doneBtn: {
    backgroundColor: "#111827",
    margin: 24,
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
  },
});

export default SafetyNetPage;
