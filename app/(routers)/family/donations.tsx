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
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Linking from "expo-linking"; // Use standard linking instead of Stripe SDK
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
  const [minimumDonation, setMinimumDonation] = useState("");
  const [deadline, setDeadline] = useState(new Date(Date.now() + 7 * 86400000));
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (familyId) dispatch(getFamilyCampaigns(familyId));
  }, [familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getFamilyCampaigns(familyId as string)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId]);

  // --- WEB-BASED PAYMENT LOGIC (No Stripe SDK Required) ---
  const handleDonateRedirect = async () => {
    const amountNum = parseFloat(donationAmount);
    if (!amountNum || amountNum < (selectedCampaign?.minimumDonation || 0)) {
      Alert.alert(
        "Error",
        `Minimum donation is $${selectedCampaign?.minimumDonation}`
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Replace with your actual backend endpoint that returns a Stripe Checkout URL
      const response = await fetch(
        `YOUR_BACKEND_URL/donations/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(amountNum * 100),
            campaignId: selectedCampaign._id,
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        // This opens Stripe in the phone's browser (Safari/Chrome)
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
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setTargetAmount(item.targetAmount?.toString());
      setMinimumDonation(item.minimumDonation?.toString() || "0");
    } else {
      setEditingItem(null);
      setTitle("");
      setTargetAmount("");
      setMinimumDonation("");
    }
    setCampaignModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const progress = Math.min((item.currentAmount || 0) / item.targetAmount, 1);
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

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EAB308"
          />
        }
      />

      {/* DONATE MODAL */}
      <Modal
        visible={donateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDonateModalVisible(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <AppText type="bold" style={styles.modalTitle}>
              Donate to "{selectedCampaign?.title}"
            </AppText>
            <TouchableOpacity onPress={() => setDonateModalVisible(false)}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <View style={styles.donationSummary}>
              <View style={styles.summaryRow}>
                <AppText>
                  Goal:{" "}
                  <AppText type="bold">
                    ${selectedCampaign?.targetAmount}
                  </AppText>
                </AppText>
                <AppText>
                  Raised:{" "}
                  <AppText type="bold">
                    ${selectedCampaign?.currentAmount || 0}
                  </AppText>
                </AppText>
              </View>
            </View>

            <AppText style={styles.label}>Enter Donation Amount (USD)</AppText>
            <TextInput
              style={[
                styles.input,
                { fontSize: 28, textAlign: "center", padding: 20 },
              ]}
              placeholder="$0.00"
              keyboardType="numeric"
              value={donationAmount}
              onChangeText={setDonationAmount}
            />

            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <ShieldCheck size={18} color="#059669" />
                <AppText style={styles.infoText}>
                  You will be redirected to a secure payment page.
                </AppText>
              </View>
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
                  Continue to Payment
                </AppText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  submitBtn: {
    backgroundColor: "#EAB308",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 30,
  },
  donationSummary: {
    backgroundColor: "#F3F4F6",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  infoBox: { marginTop: 20 },
  infoItem: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
  },
  infoText: { fontSize: 12, color: "#166534", flex: 1 },
});

export default DonationCampaignPage;
