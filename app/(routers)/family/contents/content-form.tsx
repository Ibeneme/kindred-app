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
  Pressable,
  Image as RNImage,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Check,
  Camera,
  X,
  ExternalLink,
  User,
  BookOpen,
} from "lucide-react-native";
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
  type: "text" | "textarea" | "date" | "dropdown" | "number";
  required?: boolean;
  options?: { label: string; value: any }[];
};

const getFormFieldsForType = (contentType: string): FormField[] => {
  const isPatriarch = contentType === "Patriarch";
  const titleLabel = isPatriarch ? "Patriarch Name *" : "Title *";

  const baseFields: FormField[] = [
    { key: "title", label: titleLabel, type: "text", required: true },
    {
      key: "description",
      label: isPatriarch ? "Biography *" : "Description *",
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

  if (isPatriarch) {
    return [
      ...baseFields,
      { key: "yearOfBirth", label: "Year of Birth", type: "number" },
      {
        key: "yearOfDeath",
        label: "Year of Passing (optional)",
        type: "number",
      },
      { key: "occupation", label: "Occupation", type: "text" },
    ];
  }

  if (contentType === "Language Lesson") {
    return [
      ...baseFields,
      { key: "videoUrl", label: "Lesson Video Link (URL)", type: "text" },
    ];
  }

  return baseFields;
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

  useEffect(() => {
    if ((mode === "edit" || mode === "view") && itemId) {
      const item = contents.find((c: any) => c._id === itemId);
      if (item) {
        setFormValues({
          title: item.title || "",
          description: item.description || "",
          videoUrl: item.videoUrl || "",
          ...item.metadata,
        });
        if (item.images)
          setSelectedImages(
            item.images.map((img: any) => ({ uri: img.url, isRemote: true }))
          );
      }
    }
  }, [mode, itemId]);

  const handleOpenLink = async (url: string) => {
    if (!url) return;
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    const supported = await Linking.canOpenURL(formattedUrl);
    if (supported) await Linking.openURL(formattedUrl);
    else Alert.alert("Error", "Could not open this link.");
  };

  const renderMetadataDisplay = () => {
    const activeEntries = Object.entries(formValues).filter(([key, val]) => {
      if (["title", "description", "visibility"].includes(key)) return false;
      if (val === null || val === undefined || val === "" || val === 0)
        return false;
      return true;
    });

    if (activeEntries.length === 0) return null;

    return (
      <View style={styles.metaContainer}>
        <AppText type="bold" style={styles.metaHeader}>
          RECORDED INFORMATION
        </AppText>
        {activeEntries.map(([key, val]) => {
          const isUrl =
            key.toLowerCase().includes("url") ||
            (typeof val === "string" && val.includes("http"));
          const label = key.replace(/([A-Z])/g, " $1").toUpperCase();

          return (
            <View key={key} style={styles.metaRow}>
              <AppText style={styles.metaLabel}>{label}:</AppText>
              {isUrl ? (
                <TouchableOpacity
                  onPress={() => handleOpenLink(val as string)}
                  style={styles.linkBox}
                >
                  <AppText style={styles.linkText} numberOfLines={1}>
                    {val}
                  </AppText>
                  <ExternalLink size={14} color={BRAND_YELLOW} />
                </TouchableOpacity>
              ) : (
                <AppText style={styles.metaValue}>{val}</AppText>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const handleSave = async () => {
    if (!formValues.title?.trim())
      return Alert.alert("Required", "Please enter a Name/Title");

    setLoading(true);
    const payload = {
      familyId,
      contentType,
      title: formValues.title,
      description: formValues.description,
      videoUrl: formValues.videoUrl, // Language Lesson support
      metadata: { ...formValues },
      images: selectedImages.filter((img) => !img.isRemote),
    };

    try {
      if (mode === "edit")
        await dispatch(
          updateFamilyContent({ id: itemId, ...payload })
        ).unwrap();
      else await dispatch(createFamilyContent(payload)).unwrap();
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to save content");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formValues[field.key];
    if (mode === "view") return null;

    return (
      <View style={{ marginTop: 16 }}>
        <AppText style={styles.label}>{field.label}</AppText>
        {field.type === "dropdown" ? (
          <DropDownPicker
            open={openDropdown === field.key}
            value={value ?? "family"}
            items={field.options || []}
            setOpen={() =>
              setOpenDropdown(openDropdown === field.key ? null : field.key)
            }
            setValue={(cb) =>
              setFormValues((prev) => ({ ...prev, [field.key]: cb(value) }))
            }
            style={styles.dropdown}
            zIndex={2000}
          />
        ) : (
          <TextInput
            style={[styles.input, field.type === "textarea" && styles.textarea]}
            value={value?.toString() || ""}
            onChangeText={(t) =>
              setFormValues((prev) => ({ ...prev, [field.key]: t }))
            }
            multiline={field.type === "textarea"}
            keyboardType={field.type === "number" ? "numeric" : "default"}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color={DARK} size={26} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          {contentType}
        </AppText>
        {mode !== "view" && (
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={BRAND_YELLOW} />
            ) : (
              <Check color={BRAND_YELLOW} size={28} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {mode === "view" ? (
          <View>
            <View style={styles.typeHeader}>
              {contentType === "Patriarch" ? (
                <User color={BRAND_YELLOW} size={24} />
              ) : (
                <BookOpen color={BRAND_YELLOW} size={24} />
              )}
              <AppText type="bold" style={styles.viewTitle}>
                {formValues.title}
              </AppText>
            </View>
            <AppText style={styles.viewDesc}>{formValues.description}</AppText>
            {renderMetadataDisplay()}
          </View>
        ) : (
          fields.map(renderField)
        )}

        {/* Photos Section */}
        <View style={{ marginTop: 30 }}>
          <AppText style={styles.label}>GALLERY</AppText>
          <View style={styles.imageRow}>
            {mode !== "view" && (
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={async () => {
                  const res = await ImagePicker.launchImageLibraryAsync({
                    allowsMultipleSelection: true,
                  });
                  if (!res.canceled)
                    setSelectedImages((p) => [
                      ...p,
                      ...res.assets.map((a) => ({ uri: a.uri })),
                    ]);
                }}
              >
                <Camera size={28} color={GRAY} />
              </TouchableOpacity>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((img, idx) => (
                <View key={idx} style={styles.previewWrapper}>
                  <RNImage source={{ uri: img.uri }} style={styles.preview} />
                  {mode !== "view" && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() =>
                        setSelectedImages((p) => p.filter((_, i) => i !== idx))
                      }
                    >
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
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
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  headerTitle: { fontSize: 18, color: DARK },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: GRAY,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: DARK,
  },
  textarea: { height: 120, textAlignVertical: "top" },
  typeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  viewTitle: { fontSize: 22, color: DARK, marginLeft: 10 },
  viewDesc: { fontSize: 16, color: GRAY, lineHeight: 24, marginBottom: 25 },
  metaContainer: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  metaHeader: {
    fontSize: 12,
    color: BRAND_YELLOW,
    marginBottom: 12,
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  metaLabel: { fontSize: 11, color: GRAY, fontWeight: "bold", flex: 1 },
  metaValue: { fontSize: 14, color: DARK, flex: 1.5, textAlign: "right" },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.5,
    justifyContent: "flex-end",
  },
  linkText: {
    color: BRAND_YELLOW,
    textDecorationLine: "underline",
    marginRight: 5,
    fontSize: 14,
  },
  imageRow: { flexDirection: "row", marginTop: 12 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: GRAY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  preview: { width: 80, height: 80, borderRadius: 12 },
  previewWrapper: { marginRight: 12 },
  removeBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    padding: 3,
  },
  dropdown: { borderColor: BORDER, borderRadius: 12, borderWidth: 1.5 },
});

export default ContentFormPage;
