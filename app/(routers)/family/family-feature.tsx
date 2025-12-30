import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AppText } from "@/src/ui/AppText";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  fetchFamilyFeatures,
  createFeature,
  deleteFeature,
  FeatureType,
} from "@/src/redux/slices/featureSlice";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width - 40;

const FamilyFeaturePage = () => {
  const { familyId, type, isOwner } = useLocalSearchParams() as {
    familyId: string;
    type: FeatureType;
    isOwner: string;
  };
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const featuresState = useSelector((state: RootState) => state.features);

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");

  const featureList = featuresState[type];

  useEffect(() => {
    if (!familyId || !type) return;
    dispatch(fetchFamilyFeatures(familyId));
  }, [dispatch, familyId, type]);

  const handleCreate = async () => {
    if (!newItemTitle) return Alert.alert("Error", "Title is required");
    let data: any = { title: newItemTitle };
    if (type === "news") data.content = newItemContent;
    if (type === "tasks") data.deadline = newItemContent;
    if (type === "suggestions") data.text = newItemTitle;
    if (type === "polls") data.question = newItemTitle; // For simplicity, one option by default
    try {
      await dispatch(createFeature({ familyId, type, data })).unwrap();
      setNewItemTitle("");
      setNewItemContent("");
    } catch (err) {
      Alert.alert("Error", "Failed to create item");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(deleteFeature({ id, type })).unwrap();
          } catch (err) {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  if (featuresState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <AppText type="bold" style={{ marginTop: 10 }}>
          Loading...
        </AppText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 15 }}>
        <AppText type="bold" style={{ fontSize: 20 }}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </AppText>

        {isOwner === "true" && (
          <View style={styles.createSection}>
            <TextInput
              style={styles.input}
              placeholder="Title / Question"
              value={newItemTitle}
              onChangeText={setNewItemTitle}
            />
            {(type === "news" || type === "tasks") && (
              <TextInput
                style={styles.input}
                placeholder={type === "news" ? "Content" : "Deadline"}
                value={newItemContent}
                onChangeText={setNewItemContent}
              />
            )}
            <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
              <AppText type="bold" style={{ color: "#FFF" }}>
                Create {type.slice(0, -1)}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {featureList.length === 0 ? (
          <AppText>No {type} yet. Create one!</AppText>
        ) : (
          featureList.map((item: any) => (
            <View key={item._id} style={styles.itemCard}>
              <AppText type="bold">
                {item.title || item.question || item.text}
              </AppText>
              {item.content && <AppText>{item.content}</AppText>}
              {item.deadline && <AppText>Deadline: {item.deadline}</AppText>}
              {isOwner === "true" && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item._id)}
                >
                  <AppText type="bold" style={{ color: "#FFF" }}>
                    Delete
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  itemCard: {
    width: ITEM_WIDTH,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  deleteBtn: {
    marginTop: 10,
    backgroundColor: "#EF4444",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  createSection: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFF",
  },
  createBtn: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});

export default FamilyFeaturePage;
