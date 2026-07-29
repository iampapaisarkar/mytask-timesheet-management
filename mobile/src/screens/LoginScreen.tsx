import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { spacing } from "@mytask/theme";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { ENV } from "../config/env";

function getFirebaseAuth() {
  const config = {
    apiKey: ENV.FIREBASE_API_KEY,
    authDomain: ENV.FIREBASE_AUTH_DOMAIN,
    projectId: ENV.FIREBASE_PROJECT_ID,
    storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
    appId: ENV.FIREBASE_APP_ID,
  };
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  return getAuth(app);
}

export function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession);
  const c = useThemeStore((s) => s.colors);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const mode = useThemeStore((s) => s.mode);
  const toast = useToastStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        values.email,
        values.password,
      );
      const token = await credential.user.getIdToken();
      useAuthStore.setState({ token });
      const response = await authApi.login({
        email: values.email,
        platform: Platform.OS,
        timezone: getTimezone(),
      });
      await setSession(token, response.data.data);
      toast.success("Welcome back", "You are signed in to myTask");
    } catch (err) {
      toast.error("Login failed", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => void toggleTheme()} style={styles.themeBtn}>
          <Text style={{ color: c.primary, fontWeight: "600" }}>
            {mode === "dark" ? "Light" : "Dark"}
          </Text>
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brand, { color: c.text }]}>myTask</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>Log in to myTask</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Track work, manage teams, stay in sync.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value }, fieldState }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.muted }]}>Email</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  { borderColor: c.border, backgroundColor: c.surface, color: c.text },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
              />
              {fieldState.error ? (
                <Text style={[styles.error, { color: c.negative }]}>
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value }, fieldState }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.muted }]}>Password</Text>
              <TextInput
                secureTextEntry
                style={[
                  styles.input,
                  { borderColor: c.border, backgroundColor: c.surface, color: c.text },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
              />
              {fieldState.error ? (
                <Text style={[styles.error, { color: c.negative }]}>
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Please wait…" : "Login"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.notice, { color: c.muted }]}>
          <Text style={{ fontWeight: "700", color: c.text }}>
            Project is for showcasing purposes only.{" "}
          </Text>
          This is a real project concept. All original concept ownership and
          authorization belong to Joel Couchman. This version has been rebuilt
          solely for demonstration purposes.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  themeBtn: { alignSelf: "flex-end", marginBottom: spacing.md },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  brand: { fontSize: 28, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", marginTop: spacing.sm },
  subtitle: { marginTop: 6, marginBottom: spacing.lg, fontSize: 14 },
  field: { marginBottom: spacing.md },
  label: { marginBottom: 6, fontWeight: "600", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  error: { marginTop: 4, fontSize: 12 },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  notice: {
    marginTop: spacing.xl,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
