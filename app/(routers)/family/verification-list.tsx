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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  X,
  Eye,
  User,
  Target,
  Mail,
  Filter,
} from "lucide-react-native";
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
    isOwner: any;
  }>();

  console.warn(isOwner, "isOwnerhhhh");
  const dispatch = useDispatch<AppDispatch>();
  const {
    familyContributions = [],
    loading,
    isSubmitting,
  } = useSelector((state: RootState) => state.donations);

  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "VERIFIED" | "REJECTED"
  >("PENDING");

  useEffect(() => {
    if (familyId) dispatch(getAdminFamilyContributions(familyId));
  }, [familyId]);

  // Filter contributions by the specific campaign AND the selected status toggle
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
    if (status === "REJECTED" && !rejectionReason) {
      Alert.alert(
        "Reason required",
        "Please state why you are rejecting this."
      );
      return;
    }
    try {
      await dispatch(
        verifyContribution({
          contributionId: selectedContribution._id,
          status,
          rejectionReason,
        })
      ).unwrap();
      setModalVisible(false);
      setRejectionReason("");
      Alert.alert(
        "Done",
        `Payment ${status === "VERIFIED" ? "Approved" : "Rejected"}`
      );
    } catch (err: any) {
      Alert.alert("Error", err);
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
          style={[styles.viewBtn, !isPending && { backgroundColor: "#374151" }]}
          onPress={() => {
            setSelectedContribution(item);
            setModalVisible(true);
          }}
        >
          <Eye size={18} color="#FFF" />
          <AppText style={{ color: "#FFF", marginLeft: 5 }}>
            {isOwner === true  ? (isPending ? "Review" : "View") : "View"}
          </AppText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <AppText type="bold" style={{ fontSize: 18 }}>
            Verification List
          </AppText>
          <AppText style={{ fontSize: 12, color: "#6B7280" }}>{title}</AppText>
        </View>
      </View>

      {/* STATUS FILTER TOGGLE */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s as any)}
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

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color="#EAB308" />
      ) : (
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
      )}

      {/* VERIFICATION MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setModalVisible(false)}
          >
            <X size={30} color="#FFF" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
            <Image
              source={{ uri: selectedContribution?.paymentProof?.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.actionBox}>
              <AppText type="bold" style={styles.modalAmount}>
                ₦{selectedContribution?.amountSent?.toLocaleString()}
              </AppText>
              <View style={styles.modalDetailRow}>
                <User size={16} color="#9CA3AF" />
                <AppText style={styles.modalDetailText}>
                  From: {selectedContribution?.contributor?.firstName}{" "}
                  {selectedContribution?.contributor?.lastName}
                </AppText>
              </View>
              <View style={styles.modalDetailRow}>
                <Mail size={16} color="#9CA3AF" />
                <AppText style={styles.modalDetailText}>
                  {selectedContribution?.contributor?.email}
                </AppText>
              </View>

              {selectedContribution?.verificationStatus === "PENDING" &&
              isOwner === true  ? (
                <>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Rejection reason..."
                    placeholderTextColor="#6B7280"
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                  />
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                      onPress={() => handleAction("REJECTED")}
                      disabled={isSubmitting}
                    >
                      <X size={20} color="#FFF" />
                      <AppText style={{ color: "#FFF" }}>Reject</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                      onPress={() => handleAction("VERIFIED")}
                      disabled={isSubmitting}
                    >
                      <Check size={20} color="#FFF" />
                      <AppText style={{ color: "#FFF" }}>Approve</AppText>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.finalStatusContainer}>
                  <Check
                    size={20}
                    color={
                      selectedContribution?.verificationStatus === "VERIFIED"
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterWrapper: { backgroundColor: "#FFF", paddingVertical: 10 },
  filterContainer: { paddingHorizontal: 16, gap: 10 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  activeFilterTab: { backgroundColor: "#111827", borderColor: "#111827" },
  filterTabText: { fontSize: 12, color: "#6B7280", fontWeight: "bold" },
  activeFilterTabText: { color: "#FFF" },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
  },
  senderName: { fontSize: 16, color: "#111827" },
  amountText: { color: "#6B7280", fontSize: 14, marginTop: 2 },
  badgeRow: { flexDirection: "row", marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  viewBtn: {
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyText: { textAlign: "center", marginTop: 50, color: "#9CA3AF" },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 20,
  },
  fullImage: { width: "100%", height: 450, marginTop: 50 },
  actionBox: {
    padding: 25,
    backgroundColor: "#111827",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalAmount: { fontSize: 32, color: "#FFF", marginBottom: 15 },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  modalDetailText: { color: "#9CA3AF", fontSize: 14 },
  reasonInput: {
    backgroundColor: "#1F2937",
    color: "#FFF",
    padding: 16,
    borderRadius: 15,
    marginTop: 20,
  },
  row: { flexDirection: "row", gap: 15, marginTop: 25 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 15,
    gap: 10,
  },
  finalStatusContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  finalStatusText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

export default VerificationListPage;
