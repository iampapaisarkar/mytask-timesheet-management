import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@mytask/api";
import { spacing } from "@mytask/theme";
import type { UserProfile } from "@mytask/types";
import { getErrorMessage, phoneValueFromE164 } from "@mytask/utils";
import {
  profileSchema,
  type ProfileFormValues,
} from "@mytask/validation";
import { isTracking } from "../services/trackingSession";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { resetAllStores } from "../store/resetAllStores";
import { signOutUser } from "../services/firebase";
import type { RootStackParamList } from "../navigation/RootNavigator";

function profileDefaults(user: UserProfile | null): ProfileFormValues {
  const phone = phoneValueFromE164(
    user?.phone_number,
    user?.phone_country_iso,
  );
  return {
    first_name: user?.first_name || "",
    middle_name: user?.middle_name || "",
    last_name: user?.last_name || "",
    dob: (user?.dob as string) || "",
    phone_number: phone.phone_number || "",
    phone_country_code: phone.phone_country_code,
    phone_country_iso: phone.phone_country_iso,
  };
}

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const toast = useToastStore();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(user),
  });

  useEffect(() => {
    reset(profileDefaults(user));
  }, [user, reset]);

  async function onSubmit(values: ProfileFormValues) {
    setFormError(null);
    const phone = phoneValueFromE164(
      values.phone_number || null,
      values.phone_country_iso,
    );
    try {
      const res = await authApi.updateProfile({
        ...values,
        phone_number: phone.phone_number || values.phone_number || null,
        phone_country_code:
          phone.phone_country_code || values.phone_country_code || null,
        phone_country_iso:
          phone.phone_country_iso || values.phone_country_iso || null,
      });
      const updated = res.data.data;
      if (token && updated) {
        await setSession(token, updated);
      }
      toast.success("Profile updated");
      reset(profileDefaults(updated));
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error("Update failed", message);
    }
  }

  async function logout() {
    if (await isTracking()) {
      Alert.alert(
        "Tracking in progress",
        "Stop clock-in tracking before signing out.",
      );
      toast.warning("Stop tracking before logout");
      return;
    }
    try {
      await authApi.logout();
    } catch {
      // still clear local session
    }
    try {
      await signOutUser();
    } catch {
      // ignore — still wipe local state
    }
    await resetAllStores(queryClient);
    toast.info("Signed out");
  }

  const inputStyle = [
    styles.input,
    { borderColor: c.border, backgroundColor: c.surface, color: c.text },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.label, { color: c.muted }]}>Signed in as</Text>
          <Text style={[styles.email, { color: c.text }]}>
            {user?.email || "Account"}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>
          Edit profile
        </Text>

        <Controller
          control={control}
          name="first_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>
                First name
              </Text>
              <TextInput
                style={inputStyle}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholderTextColor={c.muted}
                autoCapitalize="words"
              />
              {errors.first_name ? (
                <Text style={[styles.fieldError, { color: c.negative }]}>
                  {errors.first_name.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="middle_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>
                Middle name
              </Text>
              <TextInput
                style={inputStyle}
                value={value || ""}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholderTextColor={c.muted}
                autoCapitalize="words"
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="last_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>
                Last name
              </Text>
              <TextInput
                style={inputStyle}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholderTextColor={c.muted}
                autoCapitalize="words"
              />
              {errors.last_name ? (
                <Text style={[styles.fieldError, { color: c.negative }]}>
                  {errors.last_name.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="phone_number"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>
                Phone (E.164, e.g. +61412345678)
              </Text>
              <TextInput
                style={inputStyle}
                value={value || ""}
                onChangeText={(text) => {
                  onChange(text);
                  const parsed = phoneValueFromE164(text);
                  setValue("phone_country_code", parsed.phone_country_code);
                  setValue("phone_country_iso", parsed.phone_country_iso);
                }}
                onBlur={onBlur}
                placeholderTextColor={c.muted}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              {errors.phone_number ? (
                <Text style={[styles.fieldError, { color: c.negative }]}>
                  {errors.phone_number.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        {formError ? (
          <Text style={[styles.fieldError, { color: c.negative }]}>
            {formError}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: c.primary,
              opacity: isSubmitting || !isDirty ? 0.55 : 1,
            },
          ]}
          disabled={isSubmitting || !isDirty}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
          onPress={() => navigation.navigate("Subscription")}
        >
          <Text style={[styles.rowText, { color: c.text }]}>Subscription</Text>
          <Text style={{ color: c.primary, fontWeight: "700" }}>Manage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
          onPress={() => navigation.navigate("Pricing")}
        >
          <Text style={[styles.rowText, { color: c.text }]}>Upgrade Plan</Text>
          <Text style={{ color: c.primary, fontWeight: "700" }}>Pricing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
          onPress={() => void toggle()}
        >
          <Text style={[styles.rowText, { color: c.text }]}>Theme</Text>
          <Text style={{ color: c.primary, fontWeight: "700" }}>
            {mode === "dark" ? "Dark" : "Light"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logout, { backgroundColor: c.primary }]}
          onPress={() => void logout()}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
  },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  email: { fontSize: 18, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: spacing.sm },
  field: { marginBottom: 4 },
  fieldLabel: { marginBottom: 6, fontWeight: "600", fontSize: 13 },
  fieldError: { marginTop: 4, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: { fontWeight: "600" },
  logout: {
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700" },
});
