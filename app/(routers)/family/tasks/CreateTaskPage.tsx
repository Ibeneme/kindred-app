import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Calendar, Check } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { createTask } from "@/src/redux/slices/taskSlice";

const CreateTaskPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Get loading state to show a spinner during save
  const { loading } = useSelector((state: RootState) => state.tasks || {});
  const { familyId } = useLocalSearchParams<{ familyId: string }>();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(new Date());

  // Picker states
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  // DISPATCH LOGIC
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a task title.");
      return;
    }

    if (!familyId) {
      Alert.alert("Error", "Family ID is missing.");
      return;
    }

    try {
      // We unwrap to handle the result or error locally
      await dispatch(
        createTask({
          familyId,
          title: title.trim(),
          details: details.trim(),
          deadline: date.toISOString(),
        })
      ).unwrap();

      Alert.alert("Success", "Task created successfully!");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error || "Failed to create task.");
    }
  };

  // ANDROID PICKER FIX (Double-step)
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowPicker(false);
      setPickerMode("date");
      return;
    }

    const currentDate = selectedDate || date;

    if (Platform.OS === "android") {
      if (pickerMode === "date") {
        setDate(currentDate);
        setPickerMode("time");
        setShowPicker(false);
        // Delay ensures the first dialog closes before the second opens
        setTimeout(() => setShowPicker(true), 100);
      } else {
        setDate(currentDate);
        setShowPicker(false);
        setPickerMode("date");
      }
    } else {
      setDate(currentDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>
          New Task
        </AppText>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FBBF24" />
          ) : (
            <Check color="#FBBF24" size={28} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <AppText style={styles.label}>Task Title</AppText>
        <TextInput
          style={styles.input}
          placeholder="e.g. Buy groceries"
          value={title}
          onChangeText={setTitle}
        />

        <AppText style={styles.label}>Notes</AppText>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Add details..."
          value={details}
          onChangeText={setDetails}
          multiline
        />

        <AppText style={styles.label}>Deadline</AppText>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => {
            setPickerMode("date");
            setShowPicker(true);
          }}
        >
          <Calendar size={20} color="#111827" />
          <AppText style={{ marginLeft: 10 }}>
            {date.toLocaleDateString()}{" "}
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </AppText>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode={Platform.OS === "ios" ? "datetime" : pickerMode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" } as ViewStyle,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    marginTop: 20,
    fontWeight: "bold",
  } as TextStyle,
  input: {
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  } as TextStyle,
  textarea: { height: 100, textAlignVertical: "top" } as TextStyle,
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
});

export default CreateTaskPage;
