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
import { useDispatch } from "react-redux";
import {
  ArrowLeft,
  Plus,
  X,
  Calendar,
  Check,
  Clock,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch } from "@/src/redux/store";
import { createPoll } from "@/src/redux/slices/pollSlice";

const BRAND_YELLOW = "#EAB308";
const DARK = "#111827";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

const CreatePollPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // FIXED: showSlider replaces the old pop-up state
  const [showSlider, setShowSlider] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    endDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
  });

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Android requires specific handling for the rolling view
    if (Platform.OS === "android" && event.type === "set") {
      setShowSlider(false);
    }

    if (selectedDate) {
      setForm({ ...form, endDate: selectedDate });
    }
  };

  const addOption = () => {
    if (form.options.length < 6) {
      setForm({ ...form, options: [...form.options, ""] });
    } else {
      Alert.alert("Limit Reached", "Max 6 options.");
    }
  };

  const removeOption = (index: number) => {
    if (form.options.length > 2) {
      const newOpts = form.options.filter((_, i) => i !== index);
      setForm({ ...form, options: newOpts });
    }
  };

  const handlePublish = async () => {
    const validOptions = form.options.filter((opt) => opt.trim() !== "");
    const now = new Date();

    if (!form.title.trim())
      return Alert.alert("Required", "Please enter a question.");
    if (validOptions.length < 2)
      return Alert.alert("Required", "Minimum 2 options.");

    // Future Check (1-minute buffer)
    if (form.endDate.getTime() <= now.getTime() + 60000) {
      return Alert.alert("Invalid Date", "The deadline must be in the future.");
    }

    setIsSubmitting(true);
    try {
      const action = await dispatch(
        createPoll({
          ...form,
          options: validOptions,
          familyId,
          endDate: form.endDate.toISOString(),
        })
      );
      if (createPoll.fulfilled.match(action)) {
        router.back();
      } else {
        Alert.alert("Error", "Failed to launch poll.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={26} color={DARK} />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>
          New Family Poll
        </AppText>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={isSubmitting}
          style={styles.iconBtn}
        >
          {isSubmitting ? (
            <ActivityIndicator color={BRAND_YELLOW} />
          ) : (
            <Check size={28} color={BRAND_YELLOW} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AppText style={styles.label}>Poll Question *</AppText>
          <TextInput
            style={styles.input}
            placeholder="e.g. Where should we go for Christmas?"
            value={form.title}
            onChangeText={(t) => setForm({ ...form, title: t })}
          />

          <View style={styles.sectionHeader}>
            <AppText style={styles.label}>Options *</AppText>
            {form.options.length < 6 && (
              <TouchableOpacity onPress={addOption} style={styles.addBtn}>
                <Plus size={16} color={BRAND_YELLOW} />
                <AppText style={styles.addText}>Add Option</AppText>
              </TouchableOpacity>
            )}
          </View>

          {form.options.map((opt, i) => (
            <View key={i} style={styles.optionWrapper}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChangeText={(t) => {
                  const o = [...form.options];
                  o[i] = t;
                  setForm({ ...form, options: o });
                }}
              />
              {form.options.length > 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(i)}
                  style={styles.removeBtn}
                >
                  <X size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <AppText style={styles.label}>Voting Deadline *</AppText>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateBtn, { flex: 1, marginRight: 8 }]}
              onPress={() => {
                setPickerMode("date");
                setShowSlider(!showSlider);
              }}
            >
              <Calendar size={18} color={BRAND_YELLOW} />
              <AppText style={styles.dateValue}>
                {form.endDate.toLocaleDateString()}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateBtn, { flex: 1 }]}
              onPress={() => {
                setPickerMode("time");
                setShowSlider(!showSlider);
              }}
            >
              <Clock size={18} color={BRAND_YELLOW} />
              <AppText style={styles.dateValue}>
                {form.endDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </AppText>
            </TouchableOpacity>
          </View>

          {showSlider && (
            <View style={styles.sliderWrapper}>
              <DateTimePicker
                value={form.endDate}
                mode={pickerMode}
                minimumDate={new Date()}
                display="spinner" // This creates the rolling vertical slider
                onChange={onDateChange}
                textColor={DARK}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setShowSlider(false)}
                >
                  <AppText type="bold" style={{ color: BRAND_YELLOW }}>
                    Confirm {pickerMode}
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.publishBtn, isSubmitting && styles.disabledBtn]}
            onPress={handlePublish}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <AppText type="bold" style={styles.publishBtnText}>
                LAUNCH POLL
              </AppText>
            )}
          </TouchableOpacity>
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, color: DARK },
  iconBtn: { padding: 5 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: GRAY,
    marginBottom: 8,
    marginTop: 24,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: DARK,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addText: { color: BRAND_YELLOW, fontWeight: "bold", fontSize: 14 },
  optionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  removeBtn: { padding: 5 },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  dateValue: { marginLeft: 10, color: DARK, fontSize: 15, fontWeight: "600" },
  sliderWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginTop: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  doneBtn: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  publishBtn: {
    backgroundColor: DARK,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 40,
  },
  disabledBtn: { opacity: 0.7 },
  publishBtnText: { color: "#FFF", fontSize: 16 },
});

export default CreatePollPage;
