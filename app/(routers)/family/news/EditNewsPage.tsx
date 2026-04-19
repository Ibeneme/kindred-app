import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, Edit3 } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { updateNews, getNewsByFamily } from "@/src/redux/slices/newsSlice";
import { AppDispatch, RootState } from "@/src/redux/store";

const DARK = "#0F172A";
const PRIMARY_YELLOW = "#FFE66D";
const GRAY = "#64748B";
const BORDER = "#E2E8F0";

const EditNewsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { newsId, familyId } = useLocalSearchParams<{
    newsId: string;
    familyId: string;
  }>();

  // Find the specific item from store
  const { news } = useSelector((state: RootState) => state.news);
  const itemToEdit = news.find((n) => n._id === newsId);

  const [title, setTitle] = useState(itemToEdit?.title || "");
  const [content, setContent] = useState(itemToEdit?.content || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      return Alert.alert("Required", "Title and Description cannot be empty.");
    }

    setLoading(true);
    try {
      const res = await dispatch(
        updateNews({
          newsId: newsId!,
          data: { title, content },
        })
      );

      if (res.meta.requestStatus === "fulfilled") {
        // Refresh feed and go back
        dispatch(getNewsByFamily(familyId!));
        router.back();
      }
    } catch (err) {
      Alert.alert("Update Failed", "We couldn't save your changes right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* --- CUSTOM HEADER --- */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <ArrowLeft color={DARK} size={22} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <AppText type="bold" style={styles.headerTitle}>
              Refine Post
            </AppText>
            <AppText style={styles.headerSub}>Circle Update</AppText>
          </View>

          <TouchableOpacity
            onPress={handleUpdate}
            disabled={loading}
            style={[
              styles.saveBtn,
              (!title.trim() || !content.trim()) && { opacity: 0.5 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={DARK} size="small" />
            ) : (
              <Check color={DARK} size={20} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* --- EDIT INDICATOR --- */}
          <View style={styles.editIndicator}>
            <View style={styles.editIconBox}>
              <Edit3 size={18} color={DARK} />
            </View>
            <AppText type="bold" style={styles.editLabel}>
              UPDATING YOUR CONTENT
            </AppText>
          </View>

          {/* --- INPUT GROUPS --- */}
          <View style={styles.inputGroup}>
            <AppText style={styles.label} type="bold">
              HEADING
            </AppText>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Title your update..."
              placeholderTextColor={GRAY}
              selectionColor={DARK}
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText style={styles.label} type="bold">
              FULL DESCRIPTION
            </AppText>
            <TextInput
              style={[styles.titleInput, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="What would you like to change?"
              placeholderTextColor={GRAY}
              multiline
              selectionColor={DARK}
            />
          </View>

          <View style={styles.footerNote}>
            <AppText style={styles.noteText}>
              Note: Changes will be visible to all members of the circle
              immediately after saving.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 18, color: DARK },
  headerSub: {
    fontSize: 11,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  scrollBody: { padding: 24 },

  editIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  editIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  editLabel: { fontSize: 11, color: DARK, letterSpacing: 1.5 },

  inputGroup: { marginBottom: 25 },
  label: {
    fontSize: 11,
    color: GRAY,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  titleInput: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: BORDER,
    color: DARK,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  textArea: {
    height: 250,
    textAlignVertical: "top",
    lineHeight: 24,
  },

  footerNote: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  noteText: {
    fontSize: 12,
    color: GRAY,
    lineHeight: 18,
    fontStyle: "italic",
  },
});

export default EditNewsPage;
