import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
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
  Image as ImageIcon,
  Music,
  X,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { useDispatch } from "react-redux";
import { createNews } from "@/src/redux/slices/newsSlice";
import { AppDispatch } from "@/src/redux/store";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");
const PRIMARY_YELLOW = "#FFE66D";
const DARK = "#0F172A";
const GRAY = "#64748B";
const BORDER = "#E2E8F0";

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

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
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
      Alert.alert("Permission Denied", "Could not access microphone.");
    }
  };

  const stopRecording = async () => {
    setRecording(null);
    await recording?.stopAndUnloadAsync();
    setVoiceUri(recording?.getURI() || null);
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) {
      return Alert.alert(
        "Missing Info",
        "Please provide both a title and a description."
      );
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
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <ArrowLeft color={DARK} size={22} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          Create Update
        </AppText>
        <TouchableOpacity
          onPress={handlePost}
          disabled={loading}
          style={[styles.sendBtn, (!title || !content) && { opacity: 0.5 }]}
        >
          {loading ? (
            <ActivityIndicator color={DARK} size="small" />
          ) : (
            <Send color={DARK} size={20} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* --- INPUTS --- */}
        <View style={styles.inputGroup}>
          <AppText style={styles.label} type="bold">
            HEADING
          </AppText>
          <TextInput
            style={styles.titleInput}
            placeholder="What's the highlight?"
            placeholderTextColor={GRAY}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <AppText style={styles.label} type="bold">
            DESCRIPTION
          </AppText>
          <TextInput
            style={styles.contentInput}
            placeholder="Share the full story with the family..."
            placeholderTextColor={GRAY}
            multiline
            value={content}
            onChangeText={setContent}
          />
        </View>

        {/* --- MEDIA ACTIONS --- */}
        <AppText style={styles.label} type="bold">
          ATTACHMENTS
        </AppText>
        <View style={styles.mediaActions}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
            <Camera color={DARK} size={20} />
            <AppText type="bold" style={styles.mediaBtnText}>
              Photos
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mediaBtn,
              recording && {
                backgroundColor: "#FEE2E2",
                borderColor: "#EF4444",
              },
            ]}
            onPress={recording ? stopRecording : startRecording}
          >
            {recording ? (
              <Square color="#EF4444" size={20} fill="#EF4444" />
            ) : (
              <Mic color={DARK} size={20} />
            )}
            <AppText
              type="bold"
              style={[styles.mediaBtnText, recording && { color: "#EF4444" }]}
            >
              {recording ? "Stop Now" : "Voice Note"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* --- PREVIEWS / PLACEHOLDERS --- */}
        <View style={styles.previewContainer}>
          {images.length === 0 && !voiceUri && !recording && (
            <View style={styles.placeholderBox}>
              <ImageIcon size={30} color={BORDER} />
              <AppText style={styles.placeholderText}>
                No media attached yet
              </AppText>
            </View>
          )}

          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageScroll}
            >
              {images.map((img, i) => (
                <View key={i} style={styles.thumbWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.removeImgBtn}
                    onPress={() => removeImage(i)}
                  >
                    <X color="#FFF" size={12} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {recording && (
            <View style={styles.recordingStatus}>
              <ActivityIndicator
                size="small"
                color="#EF4444"
                style={{ marginRight: 10 }}
              />
              <AppText type="bold" style={{ color: "#EF4444" }}>
                Capturing Audio...
              </AppText>
            </View>
          )}

          {voiceUri && !recording && (
            <View style={styles.voicePreview}>
              <View style={styles.voiceInfo}>
                <View style={styles.voiceIconBox}>
                  <Music size={16} color={DARK} />
                </View>
                <AppText type="bold" style={{ fontSize: 13 }}>
                  Voice recording attached
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setVoiceUri(null)}
                style={styles.trashBtn}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: DARK },
  sendBtn: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollBody: { padding: 20 },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 11, color: GRAY, letterSpacing: 1.5, marginBottom: 10 },

  titleInput: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: BORDER,
    color: DARK,
  },
  contentInput: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: BORDER,
    height: 180,
    textAlignVertical: "top",
    color: DARK,
  },

  mediaActions: { flexDirection: "row", gap: 12, marginBottom: 20 },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  mediaBtnText: { fontSize: 14, color: DARK },

  previewContainer: { marginTop: 10 },
  placeholderBox: {
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: BORDER, fontSize: 12, marginTop: 8 },

  imageScroll: { flexDirection: "row" },
  thumbWrapper: { marginRight: 12, position: "relative" },
  thumb: { width: 90, height: 90, borderRadius: 16 },
  removeImgBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: DARK,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  recordingStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  voicePreview: {
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  voiceInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  voiceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY_YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  trashBtn: { padding: 8, backgroundColor: "#FEE2E2", borderRadius: 10 },
});

export default CreateNewsPage;
