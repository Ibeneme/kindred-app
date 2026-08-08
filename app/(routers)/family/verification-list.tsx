import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, X, Eye, User, Mail } from "lucide-react-native";
import { AppText } from "@/src/ui/AppText";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/redux/store";
import {
  getAdminFamilyContributions,
  verifyContribution,
} from "@/src/redux/slices/donationSlice";

const VerificationListPage = () => {
  const router = useRouter();
  const { familyId, campaignId, title, isOwner } = useLocalSearchParams<{
    familyId: string;
    campaignId: string;
    title: string;
    isOwner: string;
  }>();

  const isOwnerBool = isOwner === "true" || (isOwner as any) === true;

  const dispatch = useDispatch<AppDispatch>();
  const { familyContributions = [] } = useSelector(
    (state: RootState) => state.donations || {}
  );

  // Local state for loading and submitting instead of useSelector
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "VERIFIED" | "REJECTED"
  >("PENDING");

  // Close modal automatically when submission starts
  useEffect(() => {
    if (isSubmitting) {
      setModalVisible(false);
    }
  }, [isSubmitting]);

  useEffect(() => {
    if (familyId) {
      setLoading(true);
      dispatch(getAdminFamilyContributions(familyId)).finally(() =>
        setLoading(false)
      );
    }
  }, [familyId, dispatch]);

  const filteredContributions = useMemo(() => {
    return familyContributions.filter((item: any) => {
      const matchCampaign =
        item.campaign?._id === campaignId || item.campaign === campaignId;
      const matchStatus =
        statusFilter === "ALL"
          ? true
          : item.verificationStatus === statusFilter;
      return matchCampaign && matchStatus;
    });
  }, [familyContributions, campaignId, statusFilter]);

  const handleAction = async (status: "VERIFIED" | "REJECTED") => {
    if (!selectedContribution?._id) return;

    if (status === "REJECTED" && !rejectionReason.trim()) {
      Alert.alert(
        "Reason Required",
        "Please provide a reason for rejecting this payment."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        verifyContribution({
          contributionId: selectedContribution._id,
          status,
          rejectionReason: rejectionReason.trim(),
        })
      ).unwrap();

      setModalVisible(false);
      setRejectionReason("");
      setSelectedContribution(null);

      if (familyId) {
        await dispatch(getAdminFamilyContributions(familyId)).unwrap();
      }

      Alert.alert(
        "Success",
        `Payment ${
          status === "VERIFIED" ? "Approved" : "Rejected"
        } successfully.`
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        typeof err === "string" ? err : err?.message || "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPending = item.verificationStatus === "PENDING";

    return (
      <View style={styles.itemCard}>
        <View style={{ flex: 1 }}>
          <AppText type="bold" style={styles.senderName}>
            {item.contributor?.firstName} {item.contributor?.lastName}
          </AppText>
          <AppText style={styles.amountText}>
            ₦{item.amountSent?.toLocaleString()}
          </AppText>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isPending
                    ? "#FEF3C7"
                    : item.verificationStatus === "VERIFIED"
                    ? "#D1FAE5"
                    : "#FEE2E2",
                },
              ]}
            >
              <AppText
                style={[
                  styles.badgeText,
                  {
                    color: isPending
                      ? "#92400E"
                      : item.verificationStatus === "VERIFIED"
                      ? "#065F46"
                      : "#991B1B",
                  },
                ]}
              >
                {item.verificationStatus}
              </AppText>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, !isPending && { backgroundColor: "#111827" }]}
          onPress={() => {
            setSelectedContribution(item);
            setModalVisible(true);
          }}
        >
          <Eye size={18} color={!isPending ? "#FFF" : "#000"} />
          <AppText
            style={{
              color: !isPending ? "#FFF" : "#000",
              fontWeight: "bold",
              marginLeft: 5,
            }}
          >
            {isOwnerBool ? (isPending ? "Review" : "View") : "View"}
          </AppText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Full-Screen Activity Indicator Overlay */}
      {(loading || isSubmitting) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#EAB308" />
            <AppText type="bold" style={{ marginTop: 12, color: "#111827" }}>
              Loading...
            </AppText>
          </View>
        </View>
      )}

      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <AppText type="bold" style={{ fontSize: 18, color: "#111827" }}>
              Verification List
            </AppText>
            <AppText style={{ fontSize: 12, color: "#6B7280" }}>
              {title}
            </AppText>
          </View>
        </View>

        {/* STATUS FILTER TOGGLE */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {(["ALL", "PENDING", "VERIFIED", "REJECTED"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatusFilter(s)}
                style={[
                  styles.filterTab,
                  statusFilter === s && styles.activeFilterTab,
                ]}
              >
                <AppText
                  style={[
                    styles.filterTabText,
                    statusFilter === s && styles.activeFilterTabText,
                  ]}
                >
                  {s}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredContributions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <AppText style={styles.emptyText}>
              No contributions matching this filter.
            </AppText>
          }
        />

        {/* VERIFICATION MODAL */}
        <Modal visible={modalVisible} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
              <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                {selectedContribution?.paymentProof?.url ? (
                  <Image
                    source={{ uri: selectedContribution.paymentProof.url }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.fullImage, styles.noImage]}>
                    <AppText style={{ color: "#9CA3AF" }}>
                      No Image Proof Provided
                    </AppText>
                  </View>
                )}

                <View style={styles.actionBox}>
                  <AppText type="bold" style={styles.modalAmount}>
                    ₦{selectedContribution?.amountSent?.toLocaleString()}
                  </AppText>
                  <View style={styles.modalDetailRow}>
                    <User size={16} color="#6B7280" />
                    <AppText style={styles.modalDetailText}>
                      From: {selectedContribution?.contributor?.firstName}{" "}
                      {selectedContribution?.contributor?.lastName}
                    </AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Mail size={16} color="#6B7280" />
                    <AppText style={styles.modalDetailText}>
                      {selectedContribution?.contributor?.email}
                    </AppText>
                  </View>

                  {selectedContribution?.verificationStatus === "PENDING" &&
                  isOwnerBool ? (
                    <View style={{ marginBottom: 300 }}>
                      <TextInput
                        style={styles.reasonInput}
                        placeholder="Rejection reason (Required if rejecting)..."
                        placeholderTextColor="#9CA3AF"
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        editable={!isSubmitting}
                      />
                      <View style={styles.row}>
                        {/* REJECT */}
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: "#EF4444" },
                            isSubmitting && { opacity: 0.7 },
                          ]}
                          onPress={() => handleAction("REJECTED")}
                          disabled={isSubmitting}
                        >
                          <X size={20} color="#FFF" />
                          <AppText
                            style={{ color: "#FFF", fontWeight: "bold" }}
                          >
                            Reject
                          </AppText>
                        </TouchableOpacity>

                        {/* APPROVE */}
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: "#10B981" },
                            isSubmitting && { opacity: 0.7 },
                          ]}
                          onPress={() => handleAction("VERIFIED")}
                          disabled={isSubmitting}
                        >
                          <Check size={20} color="#FFF" />
                          <AppText
                            style={{ color: "#FFF", fontWeight: "bold" }}
                          >
                            Approve
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.finalStatusContainer}>
                      <Check
                        size={20}
                        color={
                          selectedContribution?.verificationStatus ===
                          "VERIFIED"
                            ? "#10B981"
                            : "#EF4444"
                        }
                      />
                      <AppText
                        style={[
                          styles.finalStatusText,
                          {
                            color:
                              selectedContribution?.verificationStatus ===
                              "VERIFIED"
                                ? "#10B981"
                                : "#EF4444",
                          },
                        ]}
                      >
                        Status: {selectedContribution?.verificationStatus}
                      </AppText>
                    </View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 99999,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    backgroundColor: "#FFF",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterWrapper: { backgroundColor: "#FFFFFF", paddingVertical: 10 },
  filterContainer: { paddingHorizontal: 16, gap: 10 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterTab: { backgroundColor: "#EAB308", borderColor: "#EAB308" },
  filterTabText: { fontSize: 12, color: "#6B7280", fontWeight: "bold" },
  activeFilterTabText: { color: "#000000" },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  senderName: { fontSize: 16, color: "#111827" },
  amountText: { color: "#6B7280", fontSize: 14, marginTop: 2 },
  badgeRow: { flexDirection: "row", marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  viewBtn: {
    backgroundColor: "#EAB308",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyText: { textAlign: "center", marginTop: 50, color: "#9CA3AF" },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 20,
  },
  fullImage: { width: "100%", height: 350, marginTop: 40 },
  noImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  actionBox: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalAmount: { fontSize: 28, color: "#111827", marginBottom: 12 },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  modalDetailText: { color: "#4B5563", fontSize: 14 },
  reasonInput: {
    backgroundColor: "#F9FAFB",
    color: "#111827",
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  finalStatusContainer: {
    marginTop: 20,
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  finalStatusText: { fontSize: 16, fontWeight: "bold" },
});

export default VerificationListPage;
