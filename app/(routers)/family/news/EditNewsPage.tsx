import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Send, CheckCircle } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { updateNews, getNewsByFamily } from "@/src/redux/slices/newsSlice";
import { AppDispatch, RootState } from "@/src/redux/store";

const DARK = "#111827";
const PRIMARY_YELLOW = "#FBBF24";

const EditNewsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { newsId, familyId } = useLocalSearchParams<{ newsId: string, familyId: string }>();

  // Find the specific item from store
  const { news } = useSelector((state: RootState) => state.news);
  const itemToEdit = news.find((n) => n._id === newsId);

  const [title, setTitle] = useState(itemToEdit?.title || "");
  const [content, setContent] = useState(itemToEdit?.content || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      return Alert.alert("Required", "Title and Content cannot be empty.");
    }

    setLoading(true);
    try {
      const res = await dispatch(updateNews({
        newsId: newsId!,
        data: { title, content }
      }));
      
      if (res.meta.requestStatus === "fulfilled") {
        // Refresh feed and go back
        dispatch(getNewsByFamily(familyId!));
        router.back();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color={DARK} />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>Edit Post</AppText>
        <TouchableOpacity onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color={PRIMARY_YELLOW} /> : <CheckCircle color={PRIMARY_YELLOW} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <AppText style={styles.label}>Title</AppText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Update title..."
        />

        <AppText style={styles.label}>Content</AppText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder="Update content..."
          multiline
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: "#EEE" },
  label: { fontWeight: "bold", marginTop: 20, marginBottom: 5, color: "#6B7280" },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  textArea: { height: 200, textAlignVertical: "top" },
});

export default EditNewsPage;