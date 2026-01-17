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
  ArrowRight,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/src/redux/store";
import { createFamily, getFamilies } from "@/src/redux/slices/familySlice";

const { width } = Dimensions.get("window");

const CreateFamilyPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [familyName, setFamilyName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("Nuclear Family");
  const [loading, setLoading] = useState(false);

  const familyTypes = [
    { id: "1", title: "Nuclear Family", icon: <Users2 size={20} /> },
    { id: "2", title: "Extended Family", icon: <Home size={20} /> },
    { id: "3", title: "Workplace Team", icon: <Briefcase size={20} /> },
    { id: "4", title: "Alumni Group", icon: <GraduationCap size={20} /> },
    { id: "5", title: "Community", icon: <Building2 size={20} /> },
    { id: "6", title: "Religious Group", icon: <Church size={20} /> },
  ];

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert("Missing Info", "Please give your circle a name.");
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
        await dispatch(getFamilies());
        router.back();
      } else {
        Alert.alert(
          "Error",
          (resultAction.payload as string) || "Failed to create."
        );
      }
    } catch (err) {
      Alert.alert("Error", "Check your connection.");
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
        {/* Simple Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <AppText type="bold" style={styles.headerTitle}>
            CREATE CIRCLE
          </AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heroSection}>
            <AppText type="bold" style={styles.heroTitle}>
              Start your{"\n"}new circle.
            </AppText>
            <AppText style={styles.heroSub}>
              Organize your family, team, or community in one private space.
            </AppText>
          </View>

          {/* Type Selection (Pills) */}
          <AppText style={styles.sectionLabel}>CHOOSE CATEGORY</AppText>
          <View style={styles.typeGrid}>
            {familyTypes.map((type) => {
              const isSelected = selectedType === type.title;
              return (
                <TouchableOpacity
                  key={type.id}
                  activeOpacity={0.7}
                  style={[
                    styles.typePill,
                    isSelected && styles.typePillSelected,
                  ]}
                  onPress={() => setSelectedType(type.title)}
                >
                  {React.cloneElement(type.icon as React.ReactElement, {
                    color: isSelected ? "#000" : "#666",
                  })}
                  <AppText
                    style={[
                      styles.typeText,
                      isSelected && styles.typeTextSelected,
                    ]}
                  >
                    {type.title}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <AppText style={styles.inputLabel}>FAMILY OR GROUP NAME</AppText>
              <TextInput
                style={styles.textInput}
                placeholder="The Smith Family"
                placeholderTextColor="#A1A1A1"
                value={familyName}
                onChangeText={setFamilyName}
              />
            </View>

            <View style={styles.inputContainer}>
              <AppText style={styles.inputLabel}>
                DESCRIPTION (OPTIONAL)
              </AppText>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Share the purpose of this circle..."
                placeholderTextColor="#A1A1A1"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Large Action Button */}
          <TouchableOpacity
            style={[styles.createBtn, !familyName && styles.createBtnDisabled]}
            onPress={handleCreateFamily}
            disabled={!familyName || loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={styles.btnContent}>
                <AppText type="bold" style={styles.createBtnText}>
                  CREATE CIRCLE
                </AppText>
                <ArrowRight size={20} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: "#FFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 13, letterSpacing: 1.5, color: "#000" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  heroSection: { marginBottom: 35 },
  heroTitle: { fontSize: 34, color: "#000", lineHeight: 40, marginBottom: 12 },
  heroSub: { fontSize: 15, color: "#666", lineHeight: 22 },

  sectionLabel: {
    fontSize: 11,
    color: "#999",
    letterSpacing: 1,
    marginBottom: 15,
    fontWeight: "800",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 35,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  typePillSelected: { backgroundColor: "#EAB308", borderColor: "#EAB308" },
  typeText: { color: "#666", marginLeft: 8, fontWeight: "600", fontSize: 13 },
  typeTextSelected: { color: "#000" },

  formSection: { gap: 30 },
  inputContainer: { borderBottomWidth: 1.5, borderBottomColor: "#F0F0F0" },
  inputLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "800",
    marginBottom: 4,
  },
  textInput: {
    color: "#000",
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: 12,
  },
  textArea: { fontSize: 15, minHeight: 80, textAlignVertical: "top" },

  createBtn: {
    marginTop: 50,
    backgroundColor: "#EAB308",
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    // Shadow for Light Mode
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  createBtnDisabled: { backgroundColor: "#F5F5F5", shadowOpacity: 0 },
  createBtnText: { fontSize: 16, color: "#000", letterSpacing: 0.5 },
});

export default CreateFamilyPage;
