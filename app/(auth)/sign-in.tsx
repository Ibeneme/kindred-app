import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Hash,
  ChevronLeft,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";

import { AppText } from "@/src/ui/AppText";
import {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  clearError,
} from "@/src/redux/slices/authSlice";
import { AppDispatch, RootState } from "@/src/redux/store";
import { saveAuthToken } from "@/src/redux/services/secureStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthPage = () => {
  const [view, setView] = useState<
    "signin" | "signup" | "reset" | "otp" | "new_password"
  >("signin");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [dob, setDob] = useState<Date | null>(null);

  // UI states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendTimer]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [
        { text: "OK", onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // --- Handlers ---
  const handleSignIn = async () => {
    console.log("🚀 [SignIn] Attempting with:", {
      email: email.trim(),
      password,
    });

    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter email and password");
      return;
    }

    try {
      const response = await dispatch(
        login({ email: email.trim(), password })
      ).unwrap();

      // ✅ SUCCESS RESPONSE
      console.log("✅ [SignIn Success] Response:", response);
      console.log("🔐 Token:", response.token);
      console.log("👤 User:", response.user);

      // Save token
      await saveAuthToken(response.token);

      // Save full name to AsyncStorage
      const fullName = `${response.user.firstName} ${response.user.lastName}`;
      await AsyncStorage.setItem("userFullName", fullName);
      console.log("💾 Saved full name:", fullName);

      router.push("/(tabs)/home");
    } catch (error: any) {
      // ❌ ERROR RESPONSE
      console.error("❌ [SignIn Error]:", error);

      Alert.alert(
        "Login Failed",
        typeof error === "string" ? error : "Unable to sign in"
      );
    }
  };
  const handleSignUp = async () => {
    console.log("🚀 [SignUp] Attempting with:", {
      firstName,
      lastName,
      email,
      phone,
    });
    if (
      !email.trim() ||
      !password.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !dob
    ) {
      Alert.alert("Missing fields", "Please fill all required fields");
      return;
    }
    const result = await dispatch(
      register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: formatDate(dob),
        password,
      })
    );
    if (register.fulfilled.match(result)) setView("otp");
  };

  const handleVerifyOtp = async () => {
    console.log("🚀 [Verify] Sending OTP:", otp);
    if (!otp.trim()) return;
    const result = await dispatch(
      verifyOtp({ email: email.trim(), otp: otp.trim() })
    );
    console.warn(result, "result");
    if (verifyOtp.fulfilled.match(result)) {
      console.log("✅ [Verify] Success Payload:", result.payload);
      Alert.alert("Success", "Account verified successfully!");
      setView("signin");
    }
  };

  const handleResendOtp = async () => {
    console.log("🚀 [Resend] Requesting new code for:", email);
    setResendTimer(30);
    const result = await dispatch(resendOtp({ email: email.trim() }));
    if (resendOtp.fulfilled.match(result)) {
      Alert.alert("Sent", "A new code has been sent to your email.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim())
      return Alert.alert("Required", "Please enter your email");
    const result = await dispatch(forgotPassword({ email: email.trim() }));
    if (forgotPassword.fulfilled.match(result)) setView("new_password");
  };

  const handleCompleteReset = async () => {
    if (!otp || !password)
      return Alert.alert("Required", "Fill in OTP and new password");
    const result = await dispatch(
      resetPassword({ email: email.trim(), otp, newPassword: password })
    );
    if (resetPassword.fulfilled.match(result)) {
      Alert.alert("Success", "Password updated successfully");
      setView("signin");
    }
  };

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDob(selectedDate);
  };

  const BackButton = () => (
    <TouchableOpacity
      onPress={() => setView("signin")}
      style={styles.backButton}
    >
      <ChevronLeft size={24} color="#EAB308" />
      <AppText style={styles.backText} type="medium">
        Back to Sign In
      </AppText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            {/* VIEW: SIGN IN */}
            {view === "signin" && (
              <>
                <AppText style={styles.formTitle} type="bold">
                  Welcome back
                </AppText>
                <AppText style={styles.description} type="regular">
                  Sign in to your Kindred account
                </AppText>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Email
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Password
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#6B7280" />
                      ) : (
                        <Eye size={20} color="#6B7280" />
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setView("reset")}>
                    <AppText style={styles.forgotText} type="medium">
                      Forgot password?
                    </AppText>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <AppText style={styles.buttonText} type="bold">
                      Sign In
                    </AppText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setView("signup")}>
                  <AppText style={styles.footerText} type="regular">
                    Don't have an account?{" "}
                    <AppText style={styles.linkText} type="bold">
                      Sign up
                    </AppText>
                  </AppText>
                </TouchableOpacity>
              </>
            )}

            {/* VIEW: SIGN UP */}
            {view === "signup" && (
              <>
                <BackButton />
                <AppText style={styles.formTitle} type="bold">
                  Create account
                </AppText>
                <AppText style={styles.description} type="regular">
                  Join the Kindred community today
                </AppText>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <AppText style={styles.label} type="medium">
                      First Name
                    </AppText>
                    <View style={styles.inputWrapper}>
                      <User
                        size={18}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="First"
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={styles.halfInput}>
                    <AppText style={styles.label} type="medium">
                      Last Name
                    </AppText>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.inputNoIcon}
                        placeholder="Last"
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Phone Number
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Phone size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="080..."
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Date of Birth
                  </AppText>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateInput}
                  >
                    <Calendar
                      size={20}
                      color="#9CA3AF"
                      style={{ marginRight: 10 }}
                    />
                    <AppText style={styles.dateText} type="regular">
                      {dob ? dob.toLocaleDateString() : "Tap to select date"}
                    </AppText>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dob || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Email
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Password
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Min 6 characters"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#6B7280" />
                      ) : (
                        <Eye size={20} color="#6B7280" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <AppText style={styles.buttonText} type="bold">
                      Create Account
                    </AppText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* VIEW: OTP VERIFICATION */}
            {view === "otp" && (
              <>
                <BackButton />
                <AppText style={styles.formTitle} type="bold">
                  Verify Email
                </AppText>
                <AppText style={styles.description} type="regular">
                  Enter code sent to {email}
                </AppText>

                <View style={styles.inputWrapper}>
                  <Hash size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter OTP"
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={setOtp}
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  style={styles.resendBtn}
                >
                  <AppText
                    style={[
                      styles.resendText,
                      resendTimer > 0 && styles.resendDisabled,
                    ]}
                    type="medium"
                  >
                    {resendTimer > 0
                      ? `Resend code in ${resendTimer}s`
                      : "Resend Code"}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <AppText style={styles.buttonText} type="bold">
                      Verify & Login
                    </AppText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* VIEW: RESET REQUEST */}
            {view === "reset" && (
              <>
                <BackButton />
                <AppText style={styles.formTitle} type="bold">
                  Reset password
                </AppText>
                <AppText style={styles.description} type="regular">
                  Enter email to receive reset code
                </AppText>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, { marginTop: 20 }]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <AppText style={styles.buttonText} type="bold">
                      Send Reset Code
                    </AppText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* VIEW: NEW PASSWORD */}
            {view === "new_password" && (
              <>
                <BackButton />
                <AppText style={styles.formTitle} type="bold">
                  Set New Password
                </AppText>
                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    OTP Code
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Hash size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Code from email"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    New Password
                  </AppText>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="New password"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#6B7280" />
                      ) : (
                        <Eye size={20} color="#6B7280" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleCompleteReset}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <AppText style={styles.buttonText} type="bold">
                      Update Password
                    </AppText>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF7" },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 40 },
  formContainer: {},
  formTitle: { fontSize: 26, color: "#111827", marginBottom: 6 },
  description: { fontSize: 15, color: "#6B7280", marginBottom: 28 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginLeft: -5,
  },
  backText: { color: "#EAB308", fontSize: 16, marginLeft: 4 },
  inputGroup: { marginBottom: 18 },
  row: { flexDirection: "row", gap: 12, marginBottom: 24 },
  halfInput: { flex: 1 },
  label: { fontSize: 14, color: "#374151", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#111827" },
  inputNoIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  inputIcon: { marginRight: 10 },
  eyeIcon: { padding: 8 },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  dateText: { fontSize: 16, color: "#374151" },
  forgotText: {
    color: "#EAB308",
    fontSize: 14,
    textAlign: "right",
    marginTop: 8,
  },
  resendBtn: { marginTop: 15, marginBottom: 5, alignItems: "center" },
  resendText: {
    color: "#EAB308",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  resendDisabled: { color: "#9CA3AF", textDecorationLine: "none" },
  button: {
    backgroundColor: "#EAB308",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#000", fontSize: 17 },
  footerText: { marginTop: 24, fontSize: 15, color: "#6B7280" },
  linkText: { color: "#EAB308" },
});

export default AuthPage;
