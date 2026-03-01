import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Plus,
  Edit,
  X,
  ArrowLeft,
  Heart,
  ChevronRight,
  ShieldCheck,
  Upload,
  User as UserIcon,
  ChevronDown,
  ClipboardList,
  CheckCircle2,
} from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  getFamilyCampaigns,
  createCampaign,
  updateCampaign,
  contributeToCampaign,
} from "@/src/redux/slices/donationSlice";
import { fetchUserProfile } from "@/src/redux/slices/userSlice";

const CURRENCIES = [
  { code: "NGN", symbol: "₦", flag: "🇳🇬", rate: 1 },
  { code: "USD", symbol: "$", flag: "🇺🇸", rate: 1400 },
  { code: "GBP", symbol: "£", flag: "🇬🇧", rate: 1800 },
  { code: "EUR", symbol: "€", flag: "🇪🇺", rate: 1550 },
];

const DonationCampaignPage = () => {
  const router = useRouter();
  const { familyId, familyName, isOwner } = useLocalSearchParams<{
    familyId: string;
    familyName: string;
    isOwner: any;
  }>();
  const dispatch = useDispatch<AppDispatch>();

  // Redux States
  const { campaigns = [] } = useSelector(
    (state: RootState) => state.donations || {}
  );
  const { user } = useSelector((state: RootState) => state.user);

  // Local Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // UI States
  const [activeTab, setActiveTab] = useState<"all" | "created">("all");
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  // Form States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [minimumDonation, setMinimumDonation] = useState("1000");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [displayPreference, setDisplayPreference] = useState<
    "NAMED" | "ANONYMOUS"
  >("NAMED");

  useEffect(() => {
    dispatch(fetchUserProfile());
    if (familyId) {
      setIsLoading(true);
      dispatch(getFamilyCampaigns(familyId)).finally(() => setIsLoading(false));
    }
  }, [dispatch, familyId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getFamilyCampaigns(familyId as string)).finally(() =>
      setRefreshing(false)
    );
  }, [familyId]);

  const convertToNaira = (value: string) => {
    const num = parseFloat(value) || 0;
    return num * currency.rate;
  };

  const convertFromNaira = (nairaValue: number) => {
    return nairaValue / currency.rate;
  };

  const formatDisplay = (value: number) => {
    const converted = convertFromNaira(value || 0);
    return `${currency.symbol}${converted.toLocaleString(undefined, {
      maximumFractionDigits: currency.code === "NGN" ? 0 : 2,
      minimumFractionDigits: currency.code === "NGN" ? 0 : 2,
    })}`;
  };

  const filteredCampaigns = campaigns.filter((c: any) =>
    activeTab === "all" ? true : c.createdBy?._id === user?._id
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) setPaymentProof(result.assets[0]);
  };

  const handleSaveCampaign = async () => {
    if (!title || !targetAmount || !bankName || !accountNumber) {
      Alert.alert("Error", "Required fields missing.");
      return;
    }

    setIsLoading(true);
    const targetInNaira = convertToNaira(targetAmount);
    const minInNaira = convertToNaira(minimumDonation);

    const campaignData = {
      title,
      purpose,
      targetAmount: targetInNaira,
      minimumDonation: minInNaira,
      accountDetails: { bankName, accountNumber, accountName },
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      if (editingItem) {
        await dispatch(
          updateCampaign({ campaignId: editingItem._id, data: campaignData })
        ).unwrap();
      } else {
        await dispatch(
          createCampaign({ familyId: familyId!, data: campaignData })
        ).unwrap();
      }
      setCampaignModalVisible(false);
      onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualContribute = async () => {
    // SECURITY CHECK: Verify goal again before processing
    if (selectedCampaign.totalRaised >= selectedCampaign.targetAmount) {
      Alert.alert("Closed", "This campaign has already reached its goal.");
      setDonateModalVisible(false);
      return;
    }

    if (!donationAmount || !paymentProof) {
      Alert.alert("Error", "Missing amount or proof.");
      return;
    }

    setIsLoading(true);
    const amountInNaira = convertToNaira(donationAmount);

    const formData = new FormData();
    formData.append("amountSent", amountInNaira.toString());
    formData.append("displayPreference", displayPreference);
    // @ts-ignore
    formData.append("paymentProof", {
      uri: paymentProof.uri,
      type: "image/jpeg",
      name: "proof.jpg",
    });

    try {
      await dispatch(
        contributeToCampaign({ campaignId: selectedCampaign._id, formData })
      ).unwrap();
      setDonateModalVisible(false);
      setPaymentProof(null);
      setDonationAmount("");
      Alert.alert("Success", "Contribution submitted!");
      onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCampaignModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setPurpose(item.purpose);
      setTargetAmount(convertFromNaira(item.targetAmount).toString());
      setMinimumDonation(convertFromNaira(item.minimumDonation).toString());
      setBankName(item.accountDetails?.bankName);
      setAccountNumber(item.accountDetails?.accountNumber);
      setAccountName(item.accountDetails?.accountName);
    } else {
      setEditingItem(null);
      setTitle("");
      setPurpose("");
      setTargetAmount("");
      setMinimumDonation(convertFromNaira(1000).toString());
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    }
    setCampaignModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isGoalReached = (item.totalRaised || 0) >= (item.targetAmount || 0);
    const progress = Math.min(
      (item.totalRaised || 0) / (item.targetAmount || 1),
      1
    );

    return (
      <View style={[styles.card, isGoalReached && styles.cardDisabled]}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.heartCircle,
              isGoalReached && { backgroundColor: "#E5E7EB" },
            ]}
          >
            <Heart
              size={16}
              color={isGoalReached ? "#9CA3AF" : "#EF4444"}
              fill={isGoalReached ? "#9CA3AF" : "#EF4444"}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 15 }}>
            {isOwner && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/family/verification-list",
                    params: {
                      familyId,
                      campaignId: item._id,
                      title: item.title,
                      isOwner: isOwner,
                    },
                  })
                }
              >
                <ClipboardList size={20} color="#EAB308" />
              </TouchableOpacity>
            )}
            {isOwner === true && (
              <TouchableOpacity onPress={() => openCampaignModal(item)}>
                <Edit size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <AppText type="bold" style={styles.cardTitle}>
          {item.title}
        </AppText>
        <View style={styles.creatorRow}>
          <UserIcon size={12} color="#9CA3AF" />
          <AppText style={styles.creatorText}>
            By{" "}
            {item.createdBy?._id === user?._id
              ? "You"
              : `${item.createdBy?.firstName}`}
          </AppText>
        </View>

        <AppText style={styles.cardDesc} numberOfLines={2}>
          {item.purpose}
        </AppText>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <AppText style={styles.progressLabel}>Goal Progress</AppText>
            <AppText
              type="bold"
              style={{ color: isGoalReached ? "#059669" : "#111827" }}
            >
              {isGoalReached
                ? "100% (Completed)"
                : `${Math.round(progress * 100)}%`}
            </AppText>
          </View>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: isGoalReached ? "#059669" : "#EAB308",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View>
            <AppText type="bold" style={styles.raisedText}>
              {formatDisplay(item.totalRaised)}
            </AppText>
            <AppText style={styles.goalText}>
              of {formatDisplay(item.targetAmount)}
            </AppText>
          </View>

          {isGoalReached ? (
            <View style={styles.completedBadge}>
              <CheckCircle2 size={14} color="#059669" />
              <AppText type="bold" style={styles.completedText}>
                Goal Met
              </AppText>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.donateCTA}
              onPress={() => {
                setSelectedCampaign(item);
                setDonateModalVisible(true);
              }}
            >
              <AppText type="bold" style={styles.donateCTAText}>
                Contribute
              </AppText>
              <ChevronRight size={14} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#EAB308" />
            <AppText type="bold" style={{ marginTop: 10 }}>
              Processing...
            </AppText>
          </View>
        </View>
      )}

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
          style={styles.currencyToggle}
          onPress={() => setCurrencyModalVisible(true)}
        >
          <AppText style={{ fontSize: 18 }}>{currency.flag}</AppText>
          <ChevronDown size={12} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {["all", "created"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t as any)}
            style={[styles.tab, activeTab === t && styles.activeTab]}
          >
            <AppText
              type="bold"
              style={[styles.tabText, activeTab === t && styles.activeTabText]}
            >
              {t === "all" ? "All" : "Created By You"}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredCampaigns}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EAB308"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AppText style={{ color: "#9CA3AF" }}>No campaigns yet.</AppText>
          </View>
        }
      />

      {isOwner && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openCampaignModal()}
        >
          <Plus size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      <Modal visible={currencyModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.currencyDropdown}>
            {CURRENCIES.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={styles.currencyOption}
                onPress={() => {
                  setCurrency(item);
                  setCurrencyModalVisible(false);
                }}
              >
                <AppText style={{ fontSize: 20 }}>{item.flag}</AppText>
                <AppText type="bold" style={{ marginLeft: 10 }}>
                  {item.code}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CREATE MODAL */}
      <Modal
        visible={campaignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
          <View style={styles.modalHeader}>
            <AppText type="bold" style={styles.modalTitle}>
              {editingItem ? "Edit" : "New"} Campaign ({currency.code})
            </AppText>
            <TouchableOpacity
              onPress={() => setCampaignModalVisible(false)}
              style={styles.closeBtn}
            >
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ paddingHorizontal: 20 }}
          >
            <AppText style={styles.label}>Contribution Name *</AppText>
            <TextInput
              placeholderTextColor={"#666"}
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Medical Bill"
            />
            <AppText style={styles.label}>Purpose *</AppText>
            <TextInput
              placeholderTextColor={"#666"}
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              value={purpose}
              onChangeText={setPurpose}
              multiline
              placeholder="Enter a Purpose"
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.label}>
                  Target ({currency.symbol})
                </AppText>
                <TextInput
                  placeholderTextColor={"#666"}
                  style={styles.input}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.label}>Min ({currency.symbol})</AppText>
                <TextInput
                  placeholderTextColor={"#666"}
                  style={styles.input}
                  value={minimumDonation}
                  onChangeText={setMinimumDonation}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.accountSection}>
              <AppText type="bold" style={styles.sectionTitle}>
                Receiving Account
              </AppText>
              <TextInput
                placeholderTextColor={"#666"}
                style={[styles.input, { marginTop: 10 }]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank Name"
              />
              <TextInput
                placeholderTextColor={"#666"}
                style={[styles.input, { marginTop: 12 }]}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Account Number"
                keyboardType="numeric"
              />
              <TextInput
                placeholderTextColor={"#666"}
                style={[styles.input, { marginTop: 12 }]}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Account Name"
              />
            </View>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSaveCampaign}
            >
              <AppText type="bold" style={{ color: "#FFF" }}>
                Save Campaign
              </AppText>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* CONTRIBUTION MODAL */}
      <Modal
        visible={donateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
          <View style={styles.modalHeader}>
            <AppText type="bold" style={styles.modalTitle}>
              Contribute
            </AppText>
            <TouchableOpacity
              onPress={() => setDonateModalVisible(false)}
              style={styles.closeBtn}
            >
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ paddingHorizontal: 20 }}
          >
            <View style={styles.paymentInfoCard}>
              <AppText type="bold" style={styles.paymentTitle}>
                Bank Transfer Details:
              </AppText>
              <AppText style={{ color: "#9CA3AF" }}>
                Bank: {selectedCampaign?.accountDetails?.bankName}
              </AppText>
              <AppText type="bold" style={styles.mainAccountNumber}>
                {selectedCampaign?.accountDetails?.accountNumber}
              </AppText>
              <AppText style={{ color: "#E5E7EB" }}>
                {selectedCampaign?.accountDetails?.accountName}
              </AppText>
            </View>
            <View style={styles.instructionContainer}>
              <ShieldCheck size={16} color="#059669" />
              <AppText style={styles.instructionText}>
                Pay into the account above and upload proof.
              </AppText>
            </View>
            <AppText style={styles.label}>
              Amount Sent ({currency.symbol}) *
            </AppText>
            <TextInput
              placeholderTextColor={"#666"}
              style={styles.input}
              value={donationAmount}
              onChangeText={setDonationAmount}
              keyboardType="numeric"
              placeholder="0.00"
            />
            <AppText style={styles.minNote}>
              Min: {formatDisplay(selectedCampaign?.minimumDonation)}
            </AppText>
            <AppText style={styles.label}>Proof of Payment *</AppText>
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              {paymentProof ? (
                <Image
                  source={{ uri: paymentProof.uri }}
                  style={styles.proofImage}
                />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Upload size={28} color="#9CA3AF" />
                  <AppText style={styles.uploadText}>Select Receipt</AppText>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              {["NAMED", "ANONYMOUS"].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setDisplayPreference(p as any)}
                  style={[
                    styles.prefBtn,
                    displayPreference === p && styles.prefBtnActive,
                  ]}
                >
                  <AppText
                    style={{
                      color: displayPreference === p ? "#FFF" : "#6B7280",
                    }}
                  >
                    {p === "NAMED" ? "Show Name" : "Anonymous"}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: "#EF4444" }]}
              onPress={handleManualContribute}
            >
              <AppText type="bold" style={{ color: "#FFF" }}>
                Submit Proof
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280" },
  currencyToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 12,
    gap: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 5,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  activeTab: { backgroundColor: "#111827" },
  tabText: { color: "#6B7280", fontSize: 13 },
  activeTabText: { color: "#FFF" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  cardDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heartCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, color: "#111827", marginBottom: 4 },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  creatorText: { fontSize: 12, color: "#9CA3AF" },
  cardDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  progressSection: { marginBottom: 16 },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: { fontSize: 12, color: "#9CA3AF" },
  progressContainer: {
    height: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#EAB308" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F9FAFB",
  },
  raisedText: { fontSize: 18, color: "#111827" },
  goalText: { fontSize: 12, color: "#9CA3AF" },
  donateCTA: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  donateCTAText: { color: "#FFF", fontSize: 13 },
  completedBadge: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  completedText: { color: "#059669", fontSize: 13 },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  currencyDropdown: {
    marginTop: 60,
    marginRight: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 10,
    elevation: 10,
    width: 140,
  },
  currencyOption: { flexDirection: "row", alignItems: "center", padding: 12 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 24,
    alignItems: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, color: "#111827" },
  label: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 18,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  accountSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#FFF9EB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  sectionTitle: { fontSize: 14, color: "#92400E" },
  submitBtn: {
    backgroundColor: "#EAB308",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 32,
  },
  paymentInfoCard: {
    backgroundColor: "#111827",
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
  },
  paymentTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  mainAccountNumber: {
    color: "#FFF",
    fontSize: 24,
    letterSpacing: 1,
    marginVertical: 8,
  },
  instructionContainer: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  instructionText: { fontSize: 13, color: "#065F46", flex: 1 },
  uploadBox: {
    height: 140,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  uploadText: { color: "#9CA3AF", fontSize: 13, marginTop: 8 },
  proofImage: { width: "100%", height: "100%" },
  prefBtn: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    alignItems: "center",
  },
  prefBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  minNote: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
});

export default DonationCampaignPage;
