import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Hash,
  ChevronLeft,
  Sparkles,
  Check,
} from "lucide-react-native";
import { useDispatch } from "react-redux";

import { AppText } from "@/src/ui/AppText";
import {
  register,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "@/src/redux/slices/authSlice";
import { AppDispatch } from "@/src/redux/store";
import { saveAuthToken } from "@/src/redux/services/secureStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import kindredImage from "../../assets/home/new.png";
import axiosInstance from "@/src/redux/services/axiosInstance";

const AuthPage = () => {
  const [view, setView] = useState<
    "signin" | "signup" | "reset" | "otp" | "new_password"
  >("signin");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Active focus trackers
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setShowPassword(false);
  }, [view]);

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

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open the link.")
    );
  };

  const handleSignIn = async () => {
    if (isLoading) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axiosInstance.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { token, user } = response.data;
      await saveAuthToken(token);
      const fullName = `${user.firstName} ${user.lastName}`;
      await AsyncStorage.setItem("userFullName", fullName);

      setIsLoading(false);
      router.push("/(tabs)/home");
    } catch (err: any) {
      setIsLoading(false);
      const statusCode = err?.status;
      const serverMessage = err?.message || err?.data?.message;

      if (statusCode === 202 || err?.data?.isVerified === false) {
        Alert.alert(
          "Verification Required",
          "Your account is not verified. We've sent a code to your email.",
          [{ text: "Enter Code", onPress: () => setView("otp") }]
        );
        return;
      }

      if (statusCode === 400 || statusCode === 401) {
        Alert.alert(
          "Invalid Credentials",
          serverMessage || "The email or password you entered is incorrect."
        );
      } else if (serverMessage?.toLowerCase().includes("verify")) {
        setView("otp");
      } else {
        Alert.alert(
          "Login Failed",
          serverMessage || "Something went wrong. Please try again."
        );
      }
    }
  };

  const handleSignUp = async () => {
    if (isLoading) return;
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
    if (!agreedToTerms) {
      Alert.alert(
        "Terms Required",
        "You must accept the Terms of Service and Privacy Policy to continue."
      );
      return;
    }
    setIsLoading(true);
    try {
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
      setIsLoading(false);
      if (register.fulfilled.match(result)) {
        setView("otp");
      } else {
        Alert.alert(
          "Registration Failed",
          (result.payload as string) || "Please try again."
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert("Error", err?.message || "Something went wrong.");
    }
  };

  const handleVerifyOtp = async () => {
    if (isLoading) return;
    if (!otp.trim()) {
      Alert.alert("Required", "Please enter the OTP code.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await dispatch(
        verifyOtp({ email: email.trim(), otp: otp.trim() })
      );
      setIsLoading(false);
      if (verifyOtp.fulfilled.match(result)) {
        Alert.alert("Success", "Account verified! Please sign in.");
        setView("signin");
      } else {
        Alert.alert(
          "Verification Failed",
          (result.payload as string) || "Invalid or expired code."
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert(
        "Verification Failed",
        err?.message || "Invalid or expired code."
      );
    }
  };

  const handleResendOtp = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setResendTimer(30);

    try {
      const result = await dispatch(resendOtp({ email: email.trim() }));
      setIsLoading(false);
      if (resendOtp.fulfilled.match(result)) {
        Alert.alert("Sent", "A new code has been sent to your email.");
      } else {
        Alert.alert(
          "Error",
          (result.payload as string) || "Could not resend code."
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert("Error", err?.message || "Could not resend code.");
    }
  };

  const handleForgotPassword = async () => {
    if (isLoading) return;
    if (!email.trim()) {
      return Alert.alert("Required", "Please enter your email");
    }
    setIsLoading(true);
    try {
      const result = await dispatch(forgotPassword({ email: email.trim() }));
      setIsLoading(false);
      if (forgotPassword.fulfilled.match(result)) {
        setView("new_password");
      } else {
        Alert.alert("Error", (result.payload as string) || "Email not found.");
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert(
        "Error",
        err?.message || err?.data?.message || "Could not process request."
      );
    }
  };

  const handleCompleteReset = async () => {
    if (isLoading) return;
    if (!otp || !password) {
      return Alert.alert("Required", "Fill in OTP and new password");
    }
    setIsLoading(true);
    try {
      const result = await dispatch(
        resetPassword({ email: email.trim(), otp, newPassword: password })
      );
      setIsLoading(false);
      if (resetPassword.fulfilled.match(result)) {
        Alert.alert("Success", "Password updated successfully");
        setView("signin");
      } else {
        Alert.alert(
          "Error",
          (result.payload as string) || "Could not reset password."
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert("Error", err?.message || "Could not reset password.");
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
      activeOpacity={0.7}
    >
      <ChevronLeft size={18} color="#64748B" />
      <AppText style={styles.backText} type="medium">
        Back
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
          showsVerticalScrollIndicator={false}
        >
          {/* TOP HERO BRANDING */}
          <View style={styles.brandContainer}>
            <Image
              source={kindredImage}
              style={styles.logo}
              contentFit="contain"
              placeholder={{ blurhash: "L6PZfSi_.AyE_4t7t7R**0o#DgR4" }}
            />
            <View style={styles.chip}>
              <Sparkles size={12} color="#B45309" />
              <AppText style={styles.chipText} type="bold">
                FAMILY IS EVERYTHING
              </AppText>
            </View>
          </View>

          {/* MAIN CARD */}
          <View style={styles.card}>
            {/* VIEW: SIGN IN */}
            {view === "signin" && (
              <>
                <View style={styles.headerBlock}>
                  <AppText style={styles.formTitle} type="bold">
                    Welcome back
                  </AppText>
                  <AppText style={styles.description} type="regular">
                    Enter your details to access your circle
                  </AppText>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Email
                  </AppText>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "email" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Mail
                      size={18}
                      color={focusedInput === "email" ? "#D97706" : "#94A3B8"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="name@company.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <AppText style={styles.label} type="medium">
                      Password
                    </AppText>
                    <TouchableOpacity onPress={() => setView("reset")}>
                      <AppText style={styles.forgotText} type="medium">
                        Forgot?
                      </AppText>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "password" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={
                        focusedInput === "password" ? "#D97706" : "#94A3B8"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput("password")}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.togglePill}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <AppText style={styles.togglePillText} type="bold">
                        {showPassword ? "Hide" : "Show"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <AppText style={styles.primaryButtonText} type="bold">
                      Sign In
                    </AppText>
                  )}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <AppText style={styles.footerText} type="regular">
                    Don't have an account?{" "}
                  </AppText>
                  <TouchableOpacity onPress={() => setView("signup")}>
                    <AppText style={styles.linkText} type="bold">
                      Sign up
                    </AppText>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* VIEW: SIGN UP */}
            {view === "signup" && (
              <>
                <BackButton />
                <View style={styles.headerBlock}>
                  <AppText style={styles.formTitle} type="bold">
                    Join the circle
                  </AppText>
                  <AppText style={styles.description} type="regular">
                    Create your account and start building with family
                  </AppText>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <AppText style={styles.label} type="medium">
                      First Name
                    </AppText>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedInput === "firstName" &&
                          styles.inputWrapperFocused,
                      ]}
                    >
                      <User
                        size={18}
                        color={
                          focusedInput === "firstName" ? "#D97706" : "#94A3B8"
                        }
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholderTextColor="#94A3B8"
                        style={styles.input}
                        placeholder="First"
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                        onFocus={() => setFocusedInput("firstName")}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>
                  </View>
                  <View style={styles.halfInput}>
                    <AppText style={styles.label} type="medium">
                      Last Name
                    </AppText>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedInput === "lastName" &&
                          styles.inputWrapperFocused,
                      ]}
                    >
                      <TextInput
                        placeholderTextColor="#94A3B8"
                        style={styles.inputNoIcon}
                        placeholder="Last"
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                        onFocus={() => setFocusedInput("lastName")}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Phone Number
                  </AppText>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "phone" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Phone
                      size={18}
                      color={focusedInput === "phone" ? "#D97706" : "#94A3B8"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="0801 234 5678"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      onFocus={() => setFocusedInput("phone")}
                      onBlur={() => setFocusedInput(null)}
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
                    activeOpacity={0.7}
                  >
                    <Calendar
                      size={18}
                      color="#94A3B8"
                      style={{ marginRight: 10 }}
                    />
                    <AppText
                      style={[styles.dateText, dob && styles.dateTextActive]}
                      type="regular"
                    >
                      {dob ? dob.toLocaleDateString() : "Tap to pick date"}
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
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "signup_email" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Mail
                      size={18}
                      color={
                        focusedInput === "signup_email" ? "#D97706" : "#94A3B8"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="name@company.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput("signup_email")}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Password
                  </AppText>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "signup_password" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={
                        focusedInput === "signup_password"
                          ? "#D97706"
                          : "#94A3B8"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="At least 6 characters"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput("signup_password")}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.togglePill}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <AppText style={styles.togglePillText} type="bold">
                        {showPassword ? "Hide" : "Show"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>

                {/* TERMS & PRIVACY CHECKBOX */}
                <Pressable
                  style={styles.termsRow}
                  onPress={() => setAgreedToTerms((prev) => !prev)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      agreedToTerms && styles.checkboxChecked,
                    ]}
                  >
                    {agreedToTerms && (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <AppText style={styles.termsText} type="regular">
                    I agree to the{" "}
                    <AppText
                      style={styles.termsLink}
                      type="medium"
                      onPress={() =>
                        openLink("https://www.kokohorcircle.com/terms")
                      }
                    >
                      Terms of Service
                    </AppText>{" "}
                    and{" "}
                    <AppText
                      style={styles.termsLink}
                      type="medium"
                      onPress={() =>
                        openLink("https://www.kokohorcircle.com/privacy")
                      }
                    >
                      Privacy Policy
                    </AppText>
                  </AppText>
                </Pressable>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!agreedToTerms || isLoading) && styles.buttonDisabled,
                  ]}
                  onPress={handleSignUp}
                  disabled={isLoading || !agreedToTerms}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <AppText style={styles.primaryButtonText} type="bold">
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
                <View style={styles.headerBlock}>
                  <AppText style={styles.formTitle} type="bold">
                    Check your inbox
                  </AppText>
                  <AppText style={styles.description} type="regular">
                    We've emailed a verification code to{"\n"}
                    <AppText style={styles.highlightText} type="medium">
                      {email}
                    </AppText>
                  </AppText>
                </View>

                <View style={styles.inputGroup}>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "otp" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Hash
                      size={18}
                      color={focusedInput === "otp" ? "#D97706" : "#94A3B8"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="000000"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      maxLength={6}
                      placeholderTextColor="#CBD5E1"
                      onFocus={() => setFocusedInput("otp")}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
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
                      ? `Resend available in ${resendTimer}s`
                      : "Resend Code"}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <AppText style={styles.primaryButtonText} type="bold">
                      Verify & Continue
                    </AppText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* VIEW: RESET REQUEST */}
            {view === "reset" && (
              <>
                <BackButton />
                <View style={styles.headerBlock}>
                  <AppText style={styles.formTitle} type="bold">
                    Reset password
                  </AppText>
                  <AppText style={styles.description} type="regular">
                    Enter your email and we'll send you a code to regain access.
                  </AppText>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Email Address
                  </AppText>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "reset_email" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Mail
                      size={18}
                      color={
                        focusedInput === "reset_email" ? "#D97706" : "#94A3B8"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="name@company.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput("reset_email")}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { marginTop: 12 },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <AppText style={styles.primaryButtonText} type="bold">
                      Send Instructions
                    </AppText>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* VIEW: NEW PASSWORD */}
            {view === "new_password" && (
              <>
                <BackButton />
                <View style={styles.headerBlock}>
                  <AppText style={styles.formTitle} type="bold">
                    Set New Password
                  </AppText>
                  <AppText style={styles.description} type="regular">
                    Enter the code we sent plus a strong new password.
                  </AppText>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    Code (OTP)
                  </AppText>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "new_otp" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Hash
                      size={18}
                      color={focusedInput === "new_otp" ? "#D97706" : "#94A3B8"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      onFocus={() => setFocusedInput("new_otp")}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText style={styles.label} type="medium">
                    New Password
                  </AppText>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === "new_password" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Lock
                      size={18}
                      color={
                        focusedInput === "new_password" ? "#D97706" : "#94A3B8"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="New password"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedInput("new_password")}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.togglePill}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <AppText style={styles.togglePillText} type="bold">
                        {showPassword ? "Hide" : "Show"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleCompleteReset}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <AppText style={styles.primaryButtonText} type="bold">
                      Save & Sign In
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
  container: {
    flex: 1,
    backgroundColor: "#F8F5F0", // soft warm cream
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  brandContainer: {
    alignItems: "center",
    marginVertical: 18,
  },
  logo: {
    height: 56,
    width: 160,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    marginTop: 10,
  },
  chipText: {
    color: "#B45309",
    fontSize: 11,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    shadowColor: "#78716C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  headerBlock: {
    marginBottom: 22,
  },
  formTitle: {
    fontSize: 26,
    color: "#1C1917",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: "#78716C",
    lineHeight: 21,
  },
  highlightText: {
    color: "#D97706",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    color: "#64748B",
    fontSize: 14,
    marginLeft: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: "#44403C",
    marginBottom: 7,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF9",
    borderWidth: 1.5,
    borderColor: "#E7E5E4",
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  inputWrapperFocused: {
    borderColor: "#D97706",
    backgroundColor: "#FFFBEB",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1C1917",
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: "600",
  },
  inputNoIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1C1917",
  },
  inputIcon: {
    marginRight: 12,
  },
  togglePill: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
  },
  togglePillText: {
    color: "#B45309",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF9",
    borderWidth: 1.5,
    borderColor: "#E7E5E4",
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  dateText: {
    fontSize: 15,
    color: "#94A3B8",
  },
  dateTextActive: {
    color: "#1C1917",
  },
  forgotText: {
    color: "#D97706",
    fontSize: 13,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    marginTop: 4,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#D6D3D1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#78716C",
    lineHeight: 20,
  },
  termsLink: {
    color: "#D97706",
    textDecorationLine: "underline",
  },
  resendBtn: {
    marginVertical: 12,
    alignItems: "center",
  },
  resendText: {
    color: "#D97706",
    fontSize: 14,
  },
  resendDisabled: {
    color: "#A8A29E",
  },
  primaryButton: {
    backgroundColor: "#EAB308",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#0F172A",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#78716C",
  },
  linkText: {
    color: "#D97706",
    fontSize: 14,
  },
});

export default AuthPage;
