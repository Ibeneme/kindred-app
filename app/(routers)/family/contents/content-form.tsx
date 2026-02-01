import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  Pressable,
  Image as RNImage,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Check,
  Camera,
  X,
  Calendar,
  Trash2,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import DropDownPicker from "react-native-dropdown-picker";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  createFamilyContent,
  updateFamilyContent,
} from "@/src/redux/slices/familyContentSlice";

const BRAND_YELLOW = "#EAB308";
const BORDER = "#E5E7EB";
const GRAY = "#6B7280";
const DARK = "#111827";
const LIGHT_BG = "#F9FAFB";

type FormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "switch" | "dropdown" | "number";
  required?: boolean;
  options?: { label: string; value: any }[];
  placeholder?: string;
};

const getFormFieldsForType = (contentType: string): FormField[] => {
  const baseFields: FormField[] = [
    { key: "title", label: "Title *", type: "text", required: true },
    {
      key: "description",
      label: "Description / Story *",
      type: "textarea",
      required: true,
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "dropdown",
      options: [
        { label: "Family Members", value: "family" },
        { label: "Private (only me)", value: "private" },
      ],
      required: true,
    },
  ];

  switch (contentType) {
    case "Key Date":
      return [
        ...baseFields.filter((f) => f.key !== "visibility"), // will be re-added below
        {
          key: "eventDate",
          label: "Event Date & Time *",
          type: "date",
          required: true,
        },
        { key: "place", label: "Location", type: "text" },
        {
          key: "visibility",
          label: "Visibility",
          type: "dropdown",
          options: baseFields.find((f) => f.key === "visibility")!.options!,
        },
      ];

    case "Task":
      return [
        ...baseFields.filter((f) => f.key !== "visibility"),
        { key: "dueDate", label: "Due Date (optional)", type: "date" },
        { key: "completed", label: "Mark as Completed", type: "switch" },
        {
          key: "visibility",
          label: "Visibility",
          type: "dropdown",
          options: baseFields.find((f) => f.key === "visibility")!.options!,
        },
      ];

    case "Language Lesson":
      return [
        ...baseFields,
        {
          key: "videoUrl",
          label: "Video Link (YouTube / Vimeo)",
          type: "text",
        },
      ];

    case "Patriarch":
      return [
        ...baseFields,
        { key: "birthYear", label: "Year of Birth", type: "number" },
        {
          key: "deathYear",
          label: "Year of Passing (optional)",
          type: "number",
        },
      ];

    case "Suggestion Box":
      return [
        ...baseFields.filter((f) => f.key !== "visibility"),
        {
          key: "status",
          label: "Status",
          type: "dropdown",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Reviewed", value: "reviewed" },
            { label: "Implemented", value: "implemented" },
          ],
          required: true,
        },
        {
          key: "visibility",
          label: "Visibility",
          type: "dropdown",
          options: [
            { label: "Everyone", value: "family" },
            { label: "Admins Only", value: "admins" },
          ],
          required: true,
        },
      ];
    // Most other types use base + photos (handled separately)
    default:
      return baseFields;
  }
};

const ContentFormPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const {
    familyId,
    contentType,
    mode = "add",
    itemId,
  } = useLocalSearchParams<any>();
  const { contents } = useSelector((state: RootState) => state.familyContent);

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<string | null>(null);

  const fields = useMemo(
    () => getFormFieldsForType(contentType),
    [contentType]
  );

  // Pre-fill form in edit/view mode
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && itemId) {
      const item = contents.find((c: any) => c._id === itemId);
      if (item) {
        const initialValues: Record<string, any> = {
          title: item.title || "",
          description: item.description || "",
          visibility: item.metadata?.visibility || "family",
        };

        // Add type-specific fields
        if (contentType === "Key Date") {
          initialValues.eventDate = item.metadata?.eventDate;
          initialValues.place = item.metadata?.place;
        }
        if (contentType === "Task") {
          initialValues.dueDate = item.metadata?.dueDate;
          initialValues.completed = !!item.metadata?.completed;
        }
        if (contentType === "Language Lesson") {
          initialValues.videoUrl =
            item.metadata?.videoUrl || item.videoUrl || "";
        }
        if (contentType === "Patriarch") {
          initialValues.birthYear = item.metadata?.birthYear;
          initialValues.deathYear = item.metadata?.deathYear;
        }

        setFormValues(initialValues);
        // Images would come from item.images if your backend stores them
      }
    } else {
      // Default values for new entry
      setFormValues({
        visibility: "family",
        completed: false,
      });
      setSelectedImages([]);
    }
  }, [mode, itemId, contentType, contents]);

  const pickImages = async () => {
    if (mode === "view") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validation
    for (const field of fields) {
      if (field.required && !formValues[field.key]?.toString()?.trim()) {
        Alert.alert(
          "Required Field",
          `${field.label.replace("*", "").trim()} is required`
        );
        return;
      }
    }

    setLoading(true);

    const metadata: any = { ...formValues };
    delete metadata.title;
    delete metadata.description;

    const payload: any = {
      familyId,
      contentType,
      title: formValues.title?.trim() || "",
      description: formValues.description?.trim() || "",
      metadata,
      images: selectedImages.length > 0 ? selectedImages : undefined,
    };

    try {
      if (mode === "edit" && itemId) {
        await dispatch(
          updateFamilyContent({ id: itemId, ...payload })
        ).unwrap();
      } else {
        await dispatch(createFamilyContent(payload)).unwrap();
      }
      Alert.alert("Success", "Content saved successfully");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save content");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formValues[field.key];
    const isView = mode === "view";

    if (field.type === "dropdown") {
      return (
        <View style={{ marginTop: 16, zIndex: 1000 }}>
          <AppText style={styles.label}>{field.label}</AppText>
          <DropDownPicker
            open={openDropdown === field.key}
            value={value ?? "family"}
            items={field.options || []}
            setOpen={() =>
              setOpenDropdown(openDropdown === field.key ? null : field.key)
            }
            setValue={(cb) => {
              const newVal = cb(value);
              setFormValues((prev) => ({ ...prev, [field.key]: newVal }));
            }}
            placeholder="Select visibility"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList}
            disabled={isView}
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
              setFormValues((prev) => ({ ...prev, [field.key]: v }))
            }
            disabled={isView}
            trackColor={{ false: "#DDD", true: BRAND_YELLOW }}
            thumbColor={value ? "#FFF" : "#FFF"}
          />
        </View>
      );
    }

    if (field.type === "date") {
      const display = value
        ? new Date(value).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Select date & time";

      return (
        <View style={{ marginTop: 16 }}>
          <AppText style={styles.label}>{field.label}</AppText>
          <Pressable
            style={styles.dateBtn}
            onPress={() => !isView && setPickerField(field.key)}
          >
            <Calendar size={20} color={GRAY} />
            <AppText style={{ marginLeft: 12, color: value ? DARK : GRAY }}>
              {display}
            </AppText>
          </Pressable>

          {Platform.OS === "ios" && pickerField === field.key && (
            <DateTimePicker
              value={value ? new Date(value) : new Date()}
              mode="datetime"
              display="inline"
              onChange={(_, date) => {
                if (date) {
                  setFormValues((prev) => ({
                    ...prev,
                    [field.key]: date.toISOString(),
                  }));
                }
                setPickerField(null);
              }}
            />
          )}
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
              setFormValues((prev) => ({
                ...prev,
                [field.key]: isNaN(num!) ? undefined : num,
              }));
            }}
            keyboardType="numeric"
            placeholder={field.placeholder || "Enter year..."}
            editable={!isView}
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
              setFormValues((prev) => ({ ...prev, [field.key]: t }))
            }
            multiline
            numberOfLines={6}
            editable={!isView}
            placeholder={field.placeholder}
          />
        </>
      );
    }

    // Default text input
    return (
      <>
        <AppText style={styles.label}>{field.label}</AppText>
        <TextInput
          style={styles.input}
          value={value ?? ""}
          onChangeText={(t) =>
            setFormValues((prev) => ({ ...prev, [field.key]: t }))
          }
          placeholder={field.placeholder || "Enter..."}
          editable={!isView}
        />
      </>
    );
  };

  const canShowMedia = contentType !== "Key Date" && contentType !== "Task";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color={DARK} size={26} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {mode === "add" ? "New" : mode === "edit" ? "Edit" : "View"}{" "}
          {contentType.replace(/([A-Z])/g, " $1").trim()}
        </AppText>
        {mode !== "view" ? (
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={BRAND_YELLOW} />
            ) : (
              <Check color={BRAND_YELLOW} size={28} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {fields.map((field) => (
          <View key={field.key} style={{ marginBottom: 8 }}>
            {renderField(field)}
          </View>
        ))}

        {canShowMedia && (
          <View style={{ marginTop: 24 }}>
            <AppText style={styles.label}>
              Photos {mode !== "view" && "(optional)"}
            </AppText>

            <View style={styles.imageRow}>
              {mode !== "view" && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={pickImages}
                >
                  <Camera size={28} color={GRAY} />
                  <AppText style={{ marginTop: 4, color: GRAY, fontSize: 12 }}>
                    Add
                  </AppText>
                </TouchableOpacity>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedImages.map((img, idx) => (
                  <View key={idx} style={styles.previewWrapper}>
                    <RNImage source={{ uri: img.uri }} style={styles.preview} />
                    {mode !== "view" && (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeImage(idx)}
                      >
                        <X size={16} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {mode !== "view" && (
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <AppText type="bold" style={{ color: "#FFF", fontSize: 16 }}>
                SAVE ENTRY
              </AppText>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, color: DARK },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: GRAY,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: DARK,
  },
  textarea: { minHeight: 140, textAlignVertical: "top" },
  dropdown: {
    backgroundColor: "#FFF",
    borderColor: BORDER,
    borderRadius: 12,
  },
  dropdownList: {
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
  },
  imageRow: { flexDirection: "row", marginTop: 12 },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: GRAY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  previewWrapper: { position: "relative", marginRight: 12 },
  preview: { width: 90, height: 90, borderRadius: 12 },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
  },
  saveBtn: {
    marginTop: 32,
    backgroundColor: DARK,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
});

export default ContentFormPage;
