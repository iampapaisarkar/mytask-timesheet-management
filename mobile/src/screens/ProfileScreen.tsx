import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@mytask/api";
import { spacing, typography } from "@mytask/theme";
import type { UserProfile } from "@mytask/types";
import { getErrorMessage, phoneValueFromE164 } from "@mytask/utils";
import {
  profileSchema,
  type ProfileFormValues,
} from "@mytask/validation";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import {
  GlobalPhoneInput,
} from "../components/GlobalPhoneInput";
import { isTracking } from "../services/trackingSession";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { resetAllStores } from "../store/resetAllStores";
import { signOutUser } from "../services/firebase";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  Avatar,
  Button,
  Card,
  ListTile,
  MoonIcon,
  SectionHeader,
  SettingsIcon,
  SunIcon,
  TextField,
  WalletIcon,
} from "../ui";

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
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(user),
  });

  const phoneCountryCode = watch("phone_country_code");
  const phoneCountryIso = watch("phone_country_iso");

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

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Account";

  return (
    <FormKeyboardScroll contentContainerStyle={styles.container}>
      <Card style={styles.identityCard}>
        <Avatar name={displayName} size={56} />
        <View style={styles.identityText}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={{ color: c.muted }} numberOfLines={1}>
            {user?.email || "—"}
          </Text>
        </View>
      </Card>

      <SectionHeader title="Edit profile" />

      <Controller
        control={control}
        name="first_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="First name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="words"
            error={errors.first_name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="middle_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Middle name"
            value={value || ""}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="words"
          />
        )}
      />

      <Controller
        control={control}
        name="last_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Last name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="words"
            error={errors.last_name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phone_number"
        render={({ field: { value } }) => (
          <View style={styles.field}>
            <GlobalPhoneInput
              label="Phone"
              value={{
                phone_number: value || null,
                phone_country_code: phoneCountryCode || null,
                phone_country_iso: phoneCountryIso || null,
              }}
              onChange={(phone) => {
                setValue("phone_number", phone.phone_number || "", {
                  shouldDirty: true,
                });
                setValue(
                  "phone_country_code",
                  phone.phone_country_code,
                  { shouldDirty: true },
                );
                setValue("phone_country_iso", phone.phone_country_iso, {
                  shouldDirty: true,
                });
              }}
              error={errors.phone_number?.message}
            />
          </View>
        )}
      />

      {formError ? (
        <Text style={[styles.fieldError, { color: c.negative }]}>
          {formError}
        </Text>
      ) : null}

      <Button
        title="Save profile"
        onPress={() => void handleSubmit(onSubmit)()}
        loading={isSubmitting}
        disabled={isSubmitting || !isDirty}
        style={styles.saveBtn}
      />

      <ListTile
        title="Subscription"
        subtitle="Manage your plan and billing"
        left={<WalletIcon color={c.primary} size={20} />}
        onPress={() => navigation.navigate("Subscription")}
      />

      <ListTile
        title="Upgrade plan"
        subtitle="Compare pricing tiers"
        left={<WalletIcon color={c.primary} size={20} />}
        onPress={() => navigation.navigate("Pricing")}
      />

      <ListTile
        title="Theme"
        subtitle={mode === "dark" ? "Dark mode" : "Light mode"}
        left={
          mode === "dark" ? (
            <MoonIcon color={c.primary} size={20} />
          ) : (
            <SunIcon color={c.primary} size={20} />
          )
        }
        onPress={() => void toggle()}
        showChevron={false}
      />

      <SectionHeader title="Support" />

      {(
        [
          { label: "Help & FAQ", kind: "help" as const },
          { label: "Terms & Conditions", kind: "terms" as const },
          { label: "Privacy Policy", kind: "privacy" as const },
        ] as const
      ).map((item) => (
        <ListTile
          key={item.kind}
          title={item.label}
          left={<SettingsIcon color={c.primary} size={20} />}
          onPress={() => navigation.navigate("Legal", { kind: item.kind })}
        />
      ))}

      <Button
        title="Logout"
        variant="danger"
        onPress={() => void logout()}
        style={styles.logoutBtn}
      />
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  identityText: { flex: 1, minWidth: 0 },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    marginBottom: 2,
  },
  field: { marginBottom: spacing.md },
  fieldError: { marginTop: -4, marginBottom: spacing.sm, fontSize: 13 },
  saveBtn: { marginBottom: spacing.md },
  logoutBtn: { marginTop: spacing.md },
});
