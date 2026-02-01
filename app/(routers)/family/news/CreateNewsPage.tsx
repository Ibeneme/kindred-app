import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Camera,
  Mic,
  Square,
  Trash2,
  ArrowLeft,
  Send,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { useDispatch } from "react-redux";
import { createNews } from "@/src/redux/slices/newsSlice";
import { AppDispatch } from "@/src/redux/store";
import { Image } from "expo-image";

const PRIMARY_YELLOW = "#FBBF24";
const DARK = "#111827";

const CreateNewsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) setImages([...images, ...result.assets]);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      Alert.alert("Failed to record");
    }
  };

  const stopRecording = async () => {
    setRecording(null);
    await recording?.stopAndUnloadAsync();
    setVoiceUri(recording?.getURI() || null);
  };

  const handlePost = async () => {
    // COMPULSORY CHECK
    if (!title.trim() || !content.trim()) {
      return Alert.alert("Required", "Title and Description are mandatory.");
    }

    setLoading(true);
    const imageFiles = images.map((img) => ({
      uri: img.uri,
      name: "image.jpg",
      type: "image/jpeg",
    }));
    const voiceFile = voiceUri
      ? { uri: voiceUri, name: "voice.m4a", type: "audio/m4a" }
      : undefined;

    const res = await dispatch(
      createNews({
        familyId: familyId!,
        title,
        content,
        images: imageFiles as any,
        voiceNote: voiceFile as any,
      })
    );

    setLoading(false);
    if (res.meta.requestStatus === "fulfilled") router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color={DARK} />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>
          Create Post
        </AppText>
        <TouchableOpacity onPress={handlePost} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={PRIMARY_YELLOW} />
          ) : (
            <Send color={PRIMARY_YELLOW} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <AppText style={styles.label}>Title *</AppText>
        <TextInput
          style={styles.input}
          placeholder="Give your update a title..."
          value={title}
          onChangeText={setTitle}
        />

        <AppText style={styles.label}>Description *</AppText>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: "top" }]}
          placeholder="What's happening?"
          multiline
          value={content}
          onChangeText={setContent}
        />

        <View style={styles.mediaActions}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
            <Camera color={DARK} size={20} />
            <AppText>Add Photos</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mediaBtn,
              recording && { backgroundColor: "#FEE2E2" },
            ]}
            onPress={recording ? stopRecording : startRecording}
          >
            {recording ? (
              <Square color="red" size={20} />
            ) : (
              <Mic color={DARK} size={20} />
            )}
            <AppText>{recording ? "Stop" : "Voice Note"}</AppText>
          </TouchableOpacity>
        </View>

        {/* Previews */}
        <ScrollView horizontal style={{ marginTop: 20 }}>
          {images.map((img, i) => (
            <Image key={i} source={{ uri: img.uri }} style={styles.thumb} />
          ))}
        </ScrollView>

        {voiceUri && (
          <View style={styles.voicePreview}>
            <AppText>Voice Note Ready</AppText>
            <TouchableOpacity onPress={() => setVoiceUri(null)}>
              <Trash2 size={18} color="red" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  label: { marginTop: 15, marginBottom: 5, fontWeight: "bold", color: "#666" },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mediaActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  thumb: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
  voicePreview: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default CreateNewsPage;
