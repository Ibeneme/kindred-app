import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Image,
  Switch,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  X,
  Edit3,
  Trash2,
  ChevronLeft,
  CheckCircle2,
  BookOpen,
  Camera,
  Search,
  Calendar,
  Clock,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker, {
  DateTimePickerAndroid,
  AndroidEvent,
} from "@react-native-community/datetimepicker";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchFamilyContent,
  createFamilyContent,
  updateFamilyContent,
  deleteFamilyContent,
  FamilyContent,
} from "@/src/redux/slices/familyContentSlice";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const formatItemDate = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatFullDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type ContentType =
  | "Family History"
  | "Family Tree"
  | "Village Story"
  | "Village Tradition"
  | "Language Lesson"
  | "Patriarch"
  | "Resolution"
  | "Suggestion Box"
  | "Key Date"
  | "Task";

type FilterMode = "all" | "upcoming" | "past" | "pending" | "completed";

interface FormFieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "date" | "switch" | "dropdown" | "number";
  options?: { label: string; value: string }[];
  required?: boolean;
}

const getFormFieldsForType = (type: ContentType): FormFieldConfig[] => {
  const common = [
    { key: "title", label: "Title *", type: "text", required: true },
    { key: "description", label: "Brief Details", type: "textarea" },
  ];

  switch (type) {
    case "Key Date":
      return [
        ...common,
        {
          key: "eventDate",
          label: "Event Date & Time *",
          type: "date",
          required: true,
        },
        { key: "place", label: "Place / Location", type: "text" },
        {
          key: "visibility",
          label: "Visibility",
          type: "dropdown",
          options: [
            { label: "Private (only me)", value: "private" },
            { label: "Public (all members)", value: "public" },
          ],
          required: true,
        },
      ];

    case "Task":
      return [
        ...common,
        {
          key: "visibility",
          label: "Visibility",
          type: "dropdown",
          options: [
            { label: "Private (only me)", value: "private" },
            { label: "Public (all members)", value: "public" },
          ],
          required: true,
        },
        {
          key: "dueDate",
          label: "Due Date & Time (optional)",
          type: "date",
        },
        { key: "completed", label: "Mark as Completed", type: "switch" },
      ];

    case "Family History":
    case "Village Story":
      return [
        { key: "title", label: "Title *", type: "text", required: true },
        {
          key: "description",
          label: "Story / Details *",
          type: "textarea",
          required: true,
        },
      ];

    // ... other cases remain unchanged ...

    default:
      return common;
  }
};

const ContentManagementPage = () => {
  const {
    familyId,
    contentType: rawType,
    isOwner,
  } = useLocalSearchParams<{
    familyId: string;
    contentType: string;
    isOwner: string;
  }>();

  const contentType = rawType as ContentType;
  const canEdit = isOwner === "true";
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { contents, loading } = useSelector(
    (state: RootState) => state.familyContent
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FamilyContent | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {}
  );

  // Date picker states
  const [pickerField, setPickerField] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const formFields = useMemo(
    () => getFormFieldsForType(contentType),
    [contentType]
  );

  const isKeyDate = contentType === "Key Date";
  const isTask = contentType === "Task";
  const showPhotos =
    contentType !== "Patriarch" &&
    contentType !== "Key Date" &&
    contentType !== "Task";

  useEffect(() => {
    if (familyId && contentType) {
      dispatch(fetchFamilyContent({ familyId, type: contentType }));
    }
  }, [familyId, contentType, dispatch]);

  useEffect(() => {
    if (selectedItem) {
      setFormValues({
        title: selectedItem.title || "",
        description: selectedItem.description || "",
        ...selectedItem.metadata,
        completed: selectedItem.metadata?.completed ?? false,
      });
      setSelectedImages([]);
    } else {
      setFormValues({});
      setSelectedImages([]);
    }
  }, [selectedItem]);

  const pickImage = async () => {
    if (!showPhotos) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const assets = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `upload_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));
      setSelectedImages((prev) => [...prev, ...assets]);
    }
  };

  const filteredContents = useMemo(() => {
    let result = [...contents];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }
    if (isKeyDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (filterMode === "upcoming") {
        result = result.filter((item) => {
          const d = new Date(item.metadata?.eventDate);
          return !isNaN(d.getTime()) && d >= today;
        });
      } else if (filterMode === "past") {
        result = result.filter((item) => {
          const d = new Date(item.metadata?.eventDate);
          return !isNaN(d.getTime()) && d < today;
        });
      }
    }
    if (isTask) {
      if (filterMode === "pending") {
        result = result.filter((item) => !item.metadata?.completed);
      } else if (filterMode === "completed") {
        result = result.filter((item) => !!item.metadata?.completed);
      }
    }
    return result;
  }, [contents, searchQuery, filterMode, isKeyDate, isTask]);

  const openAndroidDateTimePicker = (fieldKey: string) => {
    setPickerField(fieldKey);

    const currentValue = formValues[fieldKey]
      ? new Date(formValues[fieldKey])
      : new Date();

    DateTimePickerAndroid.open({
      value: currentValue,
      mode: "date",
      is24Hour: true,
      onChange: (event: AndroidEvent, selectedDate?: Date) => {
        if (event.type !== "set" || !selectedDate) {
          setPickerField(null);
          return;
        }

        const updated = new Date(currentValue);
        updated.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );

        DateTimePickerAndroid.open({
          value: updated,
          mode: "time",
          is24Hour: true,
          onChange: (e: AndroidEvent, selectedTime?: Date) => {
            if (e.type !== "set" || !selectedTime) {
              setPickerField(null);
              return;
            }

            updated.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0
            );

            setFormValues((prev: any) => ({
              ...prev,
              [fieldKey]: updated.toISOString(),
            }));

            setPickerField(null);
          },
        });
      },
    });
  };

  const handleOpenModal = (
    item?: FamilyContent,
    mode: "edit" | "view" = "edit"
  ) => {
    setSelectedItem(item || null);
    setViewMode(mode === "view");
    setModalVisible(true);
  };

  const handleSave = async () => {
    for (const field of formFields) {
      if (field.required && !formValues[field.key]?.toString()?.trim()) {
        Alert.alert(
          "Required Field",
          `${field.label.replace("*", "").trim()} is required`
        );
        return;
      }
    }

    setIsSaving(true);

    const metadata: any = { ...formValues };
    delete metadata.title;
    delete metadata.description;

    const payload: any = {
      familyId: familyId!,
      contentType,
      title: formValues.title?.trim() || "",
      description: formValues.description?.trim() || "",
      images:
        showPhotos && selectedImages.length > 0 ? selectedImages : undefined,
      metadata,
    };

    try {
      if (selectedItem) {
        await dispatch(
          updateFamilyContent({ id: selectedItem._id, ...payload })
        ).unwrap();
      } else {
        await dispatch(createFamilyContent(payload)).unwrap();
      }
      setModalVisible(false);
      Alert.alert("Success", "Saved successfully!");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const renderFilterToggle = () => {
    if (!isKeyDate && !isTask) return null;

    return (
      <View style={styles.filterToggleRow}>
        <TouchableOpacity
          style={[
            styles.filterToggle,
            filterMode === (isKeyDate ? "upcoming" : "pending") &&
              styles.filterToggleActive,
          ]}
          onPress={() => setFilterMode(isKeyDate ? "upcoming" : "pending")}
        >
          <AppText style={styles.filterToggleText}>
            {isKeyDate ? "Upcoming" : "Pending"}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterToggle,
            filterMode === (isKeyDate ? "past" : "completed") &&
              styles.filterToggleActive,
          ]}
          onPress={() => setFilterMode(isKeyDate ? "past" : "completed")}
        >
          <AppText style={styles.filterToggleText}>
            {isKeyDate ? "Past" : "Completed"}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterToggle,
            filterMode === "all" && styles.filterToggleActive,
          ]}
          onPress={() => setFilterMode("all")}
        >
          <AppText style={styles.filterToggleText}>All</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: FamilyContent }) => {
    const isLong = (item.description?.length || 0) > 140;
    const preview = isLong
      ? item.description?.substring(0, 140) + "..."
      : item.description || "—";

    const firstImg = item.images?.[0]?.url;
    const showThumbnail = showPhotos && firstImg;

    let extraBadge = null;
    if (isKeyDate && item.metadata?.eventDate) {
      extraBadge = (
        <View style={[styles.badgeContainer, { backgroundColor: "#E0F2FE" }]}>
          <Calendar size={14} color="#0369A1" />
          <AppText
            style={[styles.badgeText, { color: "#0369A1", marginLeft: 4 }]}
          >
            {formatItemDate(item.metadata.eventDate)}
          </AppText>
        </View>
      );
    } else if (isTask) {
      const isDone = !!item.metadata?.completed;
      extraBadge = (
        <View
          style={[
            styles.badgeContainer,
            { backgroundColor: isDone ? "#DCFCE7" : "#FEF3C7" },
          ]}
        >
          <CheckCircle2 size={14} color={isDone ? "#16A34A" : "#D97706"} />
          <AppText
            style={[
              styles.badgeText,
              { color: isDone ? "#166534" : "#92400E", marginLeft: 4 },
            ]}
          >
            {isDone ? "Completed" : "Pending"}
          </AppText>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => handleOpenModal(item, "view")}
          >
            <AppText type="bold" style={styles.cardTitle}>
              {item.title}
            </AppText>
            {extraBadge}
            <AppText style={styles.dateText}>
              {formatFullDateTime(item.createdAt)}
            </AppText>
          </TouchableOpacity>

          {canEdit && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleOpenModal(item, "edit")}
                style={styles.editBtn}
              >
                <Edit3 size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Delete", "Delete permanently?", [
                    { text: "Cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => dispatch(deleteFamilyContent(item._id)),
                    },
                  ])
                }
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          {showThumbnail && (
            <Image source={{ uri: firstImg }} style={styles.thumbnail} />
          )}
          <AppText style={styles.cardDesc}>{preview}</AppText>
        </View>
      </View>
    );
  };

  const renderFormField = (field: FormFieldConfig) => {
    const value = formValues[field.key];

    if (field.type === "dropdown") {
      return (
        <View
          style={{
            marginTop: 12,
            zIndex: 1000 - formFields.indexOf(field) * 10,
          }}
        >
          <AppText style={styles.label}>{field.label}</AppText>
          <DropDownPicker
            open={openDropdowns[field.key] || false}
            value={value ?? null}
            items={field.options || []}
            setOpen={(open) =>
              setOpenDropdowns((prev) => ({ ...prev, [field.key]: open }))
            }
            setValue={(callback) => {
              const newValue = callback(value);
              setFormValues((prev) => ({ ...prev, [field.key]: newValue }));
            }}
            placeholder="Select..."
            style={{
              backgroundColor: "#F9FAFB",
              borderColor: "#E5E7EB",
              borderRadius: 12,
            }}
            dropDownContainerStyle={{
              borderColor: "#E5E7EB",
              borderRadius: 12,
              backgroundColor: "#FFFFFF",
              zIndex: 9999,
            }}
            textStyle={{ color: "#111827", fontSize: 16 }}
            listItemLabelStyle={{ color: "#111827" }}
            selectedItemLabelStyle={{ color: "#EAB308", fontWeight: "600" }}
            zIndex={1000}
          />
        </View>
      );
    }

    if (field.type === "switch") {
      return (
        <View style={styles.switchRow}>
          <AppText style={styles.label}>{field.label}</AppText>
          <Switch
            value={!!value}
            onValueChange={(v) =>
              setFormValues({ ...formValues, [field.key]: v })
            }
            trackColor={{ false: "#767577", true: "#EAB308" }}
            thumbColor={value ? "#f4f3f4" : "#f4f3f4"}
          />
        </View>
      );
    }

    if (field.type === "number") {
      return (
        <>
          <AppText style={styles.label}>{field.label}</AppText>
          <TextInput
            style={styles.input}
            value={value?.toString() ?? ""}
            onChangeText={(t) => {
              const num = t === "" ? undefined : Number(t);
              setFormValues({
                ...formValues,
                [field.key]: isNaN(num!) ? undefined : num,
              });
            }}
            keyboardType="numeric"
            placeholder="Year..."
          />
        </>
      );
    }

    if (field.type === "textarea") {
      return (
        <>
          <AppText style={styles.label}>{field.label}</AppText>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={value ?? ""}
            onChangeText={(t) =>
              setFormValues({ ...formValues, [field.key]: t })
            }
            multiline
            numberOfLines={5}
          />
        </>
      );
    }

    if (field.type === "date") {
      const displayValue = value
        ? new Date(value).toLocaleString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      return (
        <>
          <AppText style={styles.label}>{field.label}</AppText>
          <Pressable
            style={styles.dateInputContainer}
            onPress={() =>
              Platform.OS === "android"
                ? openAndroidDateTimePicker(field.key)
                : setPickerField(field.key)
            }
          >
            <Calendar size={20} color="#6B7280" style={{ marginRight: 12 }} />
            <AppText style={styles.dateTextValue}>
              {displayValue || "Select date & time..."}
            </AppText>
          </Pressable>

          {Platform.OS === "ios" && pickerField === field.key && (
            <DateTimePicker
              value={value ? new Date(value) : new Date()}
              mode="datetime"
              display="inline"
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setFormValues((prev: any) => ({
                    ...prev,
                    [field.key]: selectedDate.toISOString(),
                  }));
                }
              }}
              style={{ alignSelf: "center", marginTop: 12 }}
            />
          )}
        </>
      );
    }

    return (
      <>
        <AppText style={styles.label}>{field.label}</AppText>
        <TextInput
          style={styles.input}
          value={value ?? ""}
          onChangeText={(t) => setFormValues({ ...formValues, [field.key]: t })}
          placeholder={field.placeholder}
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {contentType || "Content"}
        </AppText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={20} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${contentType || "items"}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderFilterToggle()}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#EAB308"
          style={{ marginTop: 80 }}
        />
      ) : (
        <FlatList
          data={filteredContents}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookOpen size={60} color="#D1D5DB" />
              <AppText style={styles.emptyText}>No records found</AppText>
            </View>
          }
        />
      )}

      {canEdit && (
        <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()}>
          <Plus size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardWrapper}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText type="bold" style={styles.modalTitle}>
                  {viewMode ? "View" : selectedItem ? "Edit" : "Add New"}{" "}
                  {contentType}
                </AppText>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                {viewMode && selectedItem ? (
                  <View>
                    <AppText type="bold" style={styles.viewTitle}>
                      {selectedItem.title}
                    </AppText>
                    <AppText style={styles.dateText}>
                      {formatFullDateTime(selectedItem.createdAt)}
                    </AppText>
                    <View style={styles.divider} />
                    <AppText style={styles.viewDescription}>
                      {selectedItem.description || "No description provided."}
                    </AppText>

                    {showPhotos && selectedItem.images?.length > 0 && (
                      <ScrollView horizontal style={{ marginTop: 20 }}>
                        {selectedItem.images.map((img: any, idx: number) => (
                          <Image
                            key={idx}
                            source={{ uri: img.url }}
                            style={styles.largePreview}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  <>
                    {formFields.map((field) => (
                      <View key={field.key} style={styles.fieldContainer}>
                        {renderFormField(field)}
                      </View>
                    ))}

                    {showPhotos && (
                      <View style={{ marginTop: 24 }}>
                        <AppText style={styles.label}>
                          Photos (optional)
                        </AppText>
                        <View style={styles.imageRow}>
                          <TouchableOpacity
                            style={styles.addPhotoBtn}
                            onPress={pickImage}
                          >
                            <Camera size={28} color="#6B7280" />
                            <AppText style={styles.addPhotoText}>Add</AppText>
                          </TouchableOpacity>

                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                          >
                            {selectedImages.map((img, idx) => (
                              <View key={idx} style={styles.previewContainer}>
                                <Image
                                  source={{ uri: img.uri }}
                                  style={styles.previewThumb}
                                />
                                <TouchableOpacity
                                  style={styles.removePhoto}
                                  onPress={() =>
                                    setSelectedImages((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                >
                                  <X size={14} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                      onPress={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <CheckCircle2 size={22} color="#FFF" />
                          <AppText type="bold" style={styles.saveButtonText}>
                            SAVE
                          </AppText>
                        </>
                      )}
                    </TouchableOpacity>

                    <View
                      style={{ height: Platform.OS === "ios" ? 100 : 60 }}
                    />
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
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
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 19, textTransform: "capitalize" },
  backButton: { padding: 8 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  filterToggleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    gap: 12,
  },
  filterToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterToggleActive: {
    backgroundColor: "#EAB308",
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: { fontSize: 17, color: "#111827" },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  badgeText: { fontSize: 13, fontWeight: "600" },
  dateText: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  cardBody: { flexDirection: "row", marginTop: 8, gap: 12 },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cardDesc: { flex: 1, fontSize: 14, color: "#4B5563", lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 12 },
  editBtn: { padding: 6, backgroundColor: "#EFF6FF", borderRadius: 8 },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    backgroundColor: "#EAB308",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 120,
  },
  emptyText: { color: "#9CA3AF", marginTop: 16, fontSize: 16 },

  // ── Centered Modal Styles ───────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
  },
  modalKeyboardWrapper: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxHeight: "100%",
    overflow: "hidden",


  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 20,
    color: "#111827",
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 140 : 100,
  },
  viewTitle: { fontSize: 24, color: "#111827", marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 },
  viewDescription: { fontSize: 16, color: "#374151", lineHeight: 26 },
  largePreview: { width: 180, height: 180, borderRadius: 12, marginRight: 12 },
  label: {
    fontSize: 14.5,
    color: "#374151",
    marginBottom: 6,
    marginTop: 16,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textarea: { height: 110, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  imageRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    marginRight: 12,
  },
  addPhotoText: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  previewContainer: { position: "relative", marginRight: 12 },
  previewThumb: { width: 80, height: 80, borderRadius: 12 },
  removePhoto: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
  },
  fieldContainer: { marginBottom: 4 },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  dateTextValue: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#111827",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    gap: 12,
  },
  saveButtonText: { color: "#FFF", fontSize: 16.5 },
});

export default ContentManagementPage;
