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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { ArrowLeft, Plus, X, Calendar, Check } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch } from "@/src/redux/store";
import { createPoll } from "@/src/redux/slices/pollSlice";

const CreatePollPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""], // Minimum 2 options
    endDate: new Date(Date.now() + 86400000), // Default to 24 hours from now
  });

  const addOption = () => {
    if (form.options.length < 6) {
      setForm({ ...form, options: [...form.options, ""] });
    } else {
      Alert.alert("Limit Reached", "You can only have up to 6 options.");
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

    if (!form.title.trim()) {
      return Alert.alert("Required", "Please enter a poll question.");
    }
    if (validOptions.length < 2) {
      return Alert.alert("Required", "Please provide at least 2 options.");
    }
    if (form.endDate <= new Date()) {
      return Alert.alert("Invalid Date", "The deadline must be in the future.");
    }

    setIsSubmitting(true);
    const action = await dispatch(
      createPoll({
        ...form,
        options: validOptions,
        familyId,
        endDate: form.endDate.toISOString(),
      })
    );
    setIsSubmitting(false);

    if (createPoll.fulfilled.match(action)) {
      router.back();
    } else {
      Alert.alert("Error", "Failed to launch poll. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={26} color="#111827" />
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
            <ActivityIndicator color="#EAB308" />
          ) : (
            <Check size={28} color="#EAB308" />
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
            placeholder="What is the family deciding on?"
            value={form.title}
            onChangeText={(t) => setForm({ ...form, title: t })}
            multiline
          />

          <AppText style={styles.label}>Additional Details (Optional)</AppText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add some context or instructions..."
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
            multiline
          />

          <View style={styles.sectionHeader}>
            <AppText style={styles.label}>Options *</AppText>
            {form.options.length < 6 && (
              <TouchableOpacity onPress={addOption} style={styles.addBtn}>
                <Plus size={16} color="#EAB308" />
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
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color="#6B7280" />
            <AppText style={styles.dateValue}>
              {form.endDate.toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </AppText>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={form.endDate}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(e, date) => {
                setShowDatePicker(false);
                if (date) setForm({ ...form, endDate: date });
              }}
            />
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

          <AppText style={styles.disclaimer}>
            Only family admins and moderators can launch polls. Once launched,
            the deadline cannot be changed.
          </AppText>
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, color: "#111827" },
  iconBtn: { padding: 5 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addText: { color: "#EAB308", fontWeight: "bold", fontSize: 14 },
  optionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  removeBtn: { padding: 5 },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 5,
  },
  dateValue: { marginLeft: 10, color: "#111827", fontSize: 15 },
  publishBtn: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 40,
  },
  disabledBtn: { opacity: 0.7 },
  publishBtnText: { color: "#FFF", fontSize: 16 },
  disclaimer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});

export default CreatePollPage;
