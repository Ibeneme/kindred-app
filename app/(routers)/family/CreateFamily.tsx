import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Users2,
  Home,
  Briefcase,
  GraduationCap,
  Building2,
  Church,
  Info,
  Sparkles,
  Check,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/src/redux/store";
import { createFamily, getFamilies } from "@/src/redux/slices/familySlice";

// Redux
// import { useAppDispatch } from "@/src/hooks/reduxHooks"; // Your typed dispatch hook
// import { createFamily } from "@/src/features/family/familySlice";
// import { getFamilies } from "@/src/features/family/familySlice";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 52) / 2;

const CreateFamilyPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [familyName, setFamilyName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("Nuclear Family");
  const [loading, setLoading] = useState(false);

  const familyTypes = [
    {
      id: "1",
      title: "Nuclear Family",
      desc: "Parents & children",
      icon: <Users2 size={24} color="#FFF" />,
      color: "#EC4899",
    },
    {
      id: "2",
      title: "Extended Family",
      desc: "Large relatives",
      icon: <Home size={24} color="#FFF" />,
      color: "#8B5CF6",
    },
    {
      id: "3",
      title: "Workplace Team",
      desc: "Work colleagues",
      icon: <Briefcase size={24} color="#FFF" />,
      color: "#3B82F6",
    },
    {
      id: "4",
      title: "Alumni Group",
      desc: "School mates",
      icon: <GraduationCap size={24} color="#FFF" />,
      color: "#10B981",
    },
    {
      id: "5",
      title: "Community",
      desc: "Org & Leaders",
      icon: <Building2 size={24} color="#FFF" />,
      color: "#F59E0B",
    },
    {
      id: "6",
      title: "Religious Group",
      desc: "Congregation",
      icon: <Church size={24} color="#FFF" />,
      color: "#F97316",
    },
  ];

  const selectedColor =
    familyTypes.find((t) => t.title === selectedType)?.color || "#6B7280";

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert("Oops", "Please enter a family name");
      return;
    }

    setLoading(true);

    try {
      const resultAction = await dispatch(
        createFamily({
          familyName: familyName.trim(),
          familyType: selectedType,
          description: description.trim() || undefined,
        })
      );

      if (createFamily.fulfilled.match(resultAction)) {
        // Success! Refresh families list and go back
        await dispatch(getFamilies()); // Optional: refresh list immediately

        Alert.alert("Success! 🎉", `${familyName} has been created`, [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Error from rejectWithValue
        const errorMsg =
          resultAction.payload || "Failed to create family. Try again.";
        Alert.alert("Error", errorMsg as string);
      }
    } catch (err: any) {
      console.error("Unexpected create family error:", err);
      Alert.alert(
        "Network Error",
        "Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color="#111827" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText type="bold" style={styles.headerTitle}>
              New Family
            </AppText>
            <Sparkles size={18} color="#EAB308" />
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <AppText type="bold" style={styles.heroTitle}>
            Let's build your circle
          </AppText>

          <View style={styles.infoBox}>
            <Info size={18} color="#B45309" />
            <AppText style={styles.infoText}>
              Families are private spaces to share memories with your inner
              circle.
            </AppText>
          </View>

          <AppText type="bold" style={styles.sectionLabel}>
            Select Family Type
          </AppText>

          <View style={styles.typeGrid}>
            {familyTypes.map((type) => {
              const isSelected = selectedType === type.title;
              return (
                <TouchableOpacity
                  key={type.id}
                  activeOpacity={0.8}
                  style={[
                    styles.typeCard,
                    isSelected && {
                      borderColor: type.color,
                      backgroundColor: type.color + "08",
                    },
                  ]}
                  onPress={() => setSelectedType(type.title)}
                >
                  <View
                    style={[
                      styles.iconWrapper,
                      { backgroundColor: type.color },
                    ]}
                  >
                    {type.icon}
                  </View>
                  <AppText
                    type="bold"
                    style={[
                      styles.typeTitle,
                      isSelected && { color: type.color },
                    ]}
                  >
                    {type.title}
                  </AppText>
                  <AppText style={styles.typeDesc} numberOfLines={1}>
                    {type.desc}
                  </AppText>
                  {isSelected && (
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: type.color },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form Inputs */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <AppText type="bold" style={styles.inputLabel}>
                Family Name
              </AppText>
              <TextInput
                style={styles.formInput}
                placeholder="The Johnsons..."
                placeholderTextColor="#9CA3AF"
                value={familyName}
                onChangeText={setFamilyName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <AppText type="bold" style={styles.inputLabel}>
                  Description
                </AppText>
                <AppText style={styles.charCount}>
                  {description.length}/500
                </AppText>
              </View>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="What makes this group special?"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    familyName && !loading ? selectedColor : "#E5E7EB",
                },
              ]}
              onPress={handleCreateFamily}
              disabled={!familyName || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <AppText
                  type="bold"
                  style={[
                    styles.submitBtnText,
                    (!familyName || loading) && { color: "#9CA3AF" },
                  ]}
                >
                  Create Family ✨
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, color: "#111827" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  heroTitle: { fontSize: 24, color: "#111827", marginBottom: 12 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    padding: 14,
    borderRadius: 16,
    gap: 10,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  infoText: { flex: 1, fontSize: 13, color: "#92400E" },
  sectionLabel: { fontSize: 16, color: "#374151", marginBottom: 16 },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  typeCard: {
    width: CARD_WIDTH,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 12,
    position: "relative",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  typeTitle: { fontSize: 14, color: "#111827", marginBottom: 2 },
  typeDesc: { fontSize: 11, color: "#6B7280" },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  formSection: { gap: 20 },
  inputGroup: { gap: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  inputLabel: { fontSize: 14, color: "#4B5563" },
  charCount: { fontSize: 11, color: "#9CA3AF" },
  formInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 16 : 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  footer: { marginTop: 40 },
  submitBtn: {
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#FFF", fontSize: 17 },
});

export default CreateFamilyPage;
