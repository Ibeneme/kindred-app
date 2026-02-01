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
import { ArrowLeft, Check, Calendar } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import { updateTask } from "@/src/redux/slices/taskSlice";

const EditTaskPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams<any>();

  const { loading } = useSelector((state: RootState) => state.tasks);

  const [title, setTitle] = useState(params.title || "");
  const [details, setDetails] = useState(params.details || "");
  const [status, setStatus] = useState(params.status || "pending");
  const [date, setDate] = useState(new Date(params.deadline || Date.now()));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  const handleUpdate = async () => {
    if (!title.trim()) return Alert.alert("Error", "Title cannot be empty");

    try {
      await dispatch(
        updateTask({
          taskId: params.taskId,
          title: title.trim(),
          details: details.trim(),
          deadline: date.toISOString(),
          status,
        })
      ).unwrap();
      router.back();
    } catch (err) {
      Alert.alert("Update Failed", String(err));
    }
  };

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

  const getChipStyle = (s: string): ViewStyle => ({
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: status === s ? "#111827" : "transparent",
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#111827" />
        </TouchableOpacity>
        <AppText type="bold" style={{ fontSize: 18 }}>
          Edit Task
        </AppText>
        <TouchableOpacity onPress={handleUpdate} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FBBF24" />
          ) : (
            <Check color="#FBBF24" size={28} />
          )}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <AppText style={styles.label}>Title</AppText>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <AppText style={styles.label}>Details</AppText>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
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
          <Calendar size={18} color="#111827" />
          <AppText style={{ marginLeft: 10 }}>{date.toLocaleString()}</AppText>
        </TouchableOpacity>

        <AppText style={styles.label}>Status</AppText>
        <View style={styles.statusRow}>
          {["pending", "in-progress", "completed"].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatus(s)}
              style={getChipStyle(s)}
            >
              <AppText
                style={{
                  color: status === s ? "#FFF" : "#111827",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                {s.toUpperCase()}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode={Platform.OS === "ios" ? "datetime" : pickerMode}
            onChange={onDateChange}
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
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  statusRow: { flexDirection: "row", gap: 8, marginTop: 10 } as ViewStyle,
});

export default EditTaskPage;
