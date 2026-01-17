import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
  Plus,
  Edit,
  X,
  Calendar as CalendarIcon,
  ArrowLeft,
  Heart,
  ChevronRight,
  ShieldCheck,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  getFamilyCampaigns,
  createCampaign,
  updateCampaign,
} from "@/src/redux/slices/donationSlice";

const DonationCampaignPage = () => {
  const router = useRouter();
  const { familyId, familyName } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
  }>();

  const dispatch = useDispatch<AppDispatch>();
  const { campaigns = [], loading = false } = useSelector(
    (state: RootState) => state.donations || {}
  );

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [donationAmount, setDonationAmount] = useState("");

  // Campaign Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [minimumDonation, setMinimumDonation] = useState("5"); // Default $5

  useEffect(() => {
    if (familyId) dispatch(getFamilyCampaigns(familyId));
  }, [familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getFamilyCampaigns(familyId as string)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId]);

  // --- SAVE CAMPAIGN (CREATE OR UPDATE) ---
  const handleSaveCampaign = async () => {
    if (!title || !targetAmount) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    const campaignData = {
      familyId,
      title,
      description,
      targetAmount: parseFloat(targetAmount),
      minimumDonation: parseFloat(minimumDonation || "0"),
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await dispatch(
          updateCampaign({ id: editingItem._id, ...campaignData })
        ).unwrap();
        Alert.alert("Success", "Campaign updated successfully.");
      } else {
        await dispatch(createCampaign(campaignData)).unwrap();
        Alert.alert("Success", "Campaign created successfully.");
      }
      setCampaignModalVisible(false);
      onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- WEB-BASED PAYMENT LOGIC ---
  const handleDonateRedirect = async () => {
    const amountNum = parseFloat(donationAmount);
    const min = selectedCampaign?.minimumDonation || 0;

    if (!amountNum || amountNum < min) {
      Alert.alert("Error", `Minimum donation is $${min}`);
      return;
    }

    setIsProcessing(true);
    try {
      // Replace with your actual backend URL
      const response = await fetch(
        `YOUR_BACKEND_URL/donations/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(amountNum * 100), // Stripe expects cents
            campaignId: selectedCampaign._id,
            familyId: familyId,
          }),
        }
      );

      const data = await response.json();
      if (data.url) {
        await Linking.openURL(data.url);
        setDonateModalVisible(false);
        setDonationAmount("");
      } else {
        throw new Error("Could not retrieve payment link.");
      }
    } catch (err: any) {
      Alert.alert(
        "Payment Error",
        "Unable to start checkout. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openCampaignModal = (item?: any) => {
    if (item && item._id) {
      setEditingItem(item);
      setTitle(item.title);
      setDescription(item.description || "");
      setTargetAmount(item.targetAmount?.toString());
      setMinimumDonation(item.minimumDonation?.toString() || "5");
    } else {
      setEditingItem(null);
      setTitle("");
      setDescription("");
      setTargetAmount("");
      setMinimumDonation("5");
    }
    setCampaignModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const progress = Math.min(
      (item.currentAmount || 0) / (item.targetAmount || 1),
      1
    );
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.heartCircle}>
            <Heart size={18} color="#EF4444" fill="#EF4444" />
          </View>
          <TouchableOpacity onPress={() => openCampaignModal(item)}>
            <Edit size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <AppText type="bold" style={styles.cardTitle}>
          {item.title}
        </AppText>
        <AppText style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </AppText>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View>
            <AppText type="bold" style={styles.raisedText}>
              ${item.currentAmount || 0} raised
            </AppText>
            <AppText style={styles.goalText}>
              of ${item.targetAmount} goal
            </AppText>
          </View>
          <TouchableOpacity
            style={styles.donateCTA}
            onPress={() => {
              setSelectedCampaign(item);
              setDonateModalVisible(true);
            }}
          >
            <AppText type="bold" style={{ color: "#FFF", fontSize: 12 }}>
              Donate
            </AppText>
            <ChevronRight size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <AppText type="bold" style={styles.headerTitle}>
            Donations
          </AppText>
          <AppText style={styles.headerSub}>{familyName}</AppText>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openCampaignModal()}
        >
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* CAMPAIGN LIST */}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <AppText style={{ color: "#9CA3AF" }}>
                No active campaigns found.
              </AppText>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EAB308"
          />
        }
      />

      {/* CAMPAIGN CREATE/EDIT MODAL */}
      <Modal
        visible={campaignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
          <View style={styles.modalHeader}>
            <AppText type="bold" style={styles.modalTitle}>
              {editingItem ? "Edit Campaign" : "New Campaign"}
            </AppText>
            <TouchableOpacity onPress={() => setCampaignModalVisible(false)}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <AppText style={styles.label}>Title *</AppText>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="E.g. Medical Fund"
            />

            <AppText style={styles.label}>Description</AppText>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell the family about this cause..."
              multiline
            />

            <View style={{ flexDirection: "row", gap: 15 }}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.label}>Goal ($) *</AppText>
                <TextInput
                  style={styles.input}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  placeholder="1000"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.label}>Min Donation ($)</AppText>
                <TextInput
                  style={styles.input}
                  value={minimumDonation}
                  onChangeText={setMinimumDonation}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSaveCampaign}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <AppText type="bold" style={{ color: "#FFF" }}>
                  {editingItem ? "Update" : "Launch"} Campaign
                </AppText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* DONATE MODAL */}
      <Modal
        visible={donateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <AppText type="bold" style={styles.modalTitle}>
                Donate
              </AppText>
              <TouchableOpacity onPress={() => setDonateModalVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <AppText
                type="bold"
                style={{ fontSize: 20, textAlign: "center" }}
              >
                {selectedCampaign?.title}
              </AppText>

              <AppText style={styles.label}>Enter Amount (USD)</AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    fontSize: 32,
                    textAlign: "center",
                    padding: 20,
                    color: "#EF4444",
                  },
                ]}
                placeholder="$0"
                keyboardType="decimal-pad"
                value={donationAmount}
                onChangeText={setDonationAmount}
                autoFocus
              />

              <View style={styles.infoItem}>
                <ShieldCheck size={18} color="#059669" />
                <AppText style={styles.infoText}>
                  Secure payment via Stripe. Minimum is $
                  {selectedCampaign?.minimumDonation}.
                </AppText>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#EF4444" }]}
                onPress={handleDonateRedirect}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <AppText type="bold" style={{ color: "#FFF" }}>
                    Proceed to Checkout
                  </AppText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 12, color: "#6B7280" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heartCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 17, color: "#111827", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#6B7280", marginBottom: 15 },
  progressContainer: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: { height: "100%", backgroundColor: "#EAB308" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  raisedText: { fontSize: 15, color: "#111827" },
  goalText: { fontSize: 12, color: "#9CA3AF" },
  donateCTA: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18 },
  label: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 15,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#000",
  },
  submitBtn: {
    backgroundColor: "#EAB308",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 30,
  },
  infoItem: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: { fontSize: 12, color: "#166534", flex: 1 },
});

export default DonationCampaignPage;
