import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrganisationSchema,
  type CreateOrganisationFormValues,
} from "@mytask/validation";
import { useCreateOrganisation } from "@mytask/hooks";
import { currencyFromCountryIso } from "@mytask/constants";
import { spacing } from "@mytask/theme";
import type { OrganisationMembership, UserProfile } from "@mytask/types";
import {
  emptyGlobalAddress,
  getErrorMessage,
  getOrganisationRoleCode,
  hasAddressContent,
  toAddressApiPayload,
  type GlobalAddress,
} from "@mytask/utils";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PlacesAddressInput } from "../components/PlacesAddressInput";
import { useAuthStore } from "../store/authStore";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function CreateOrganisationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const createMutation = useCreateOrganisation();
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<GlobalAddress>(emptyGlobalAddress());

  const { control, handleSubmit, setValue } =
    useForm<CreateOrganisationFormValues>({
      resolver: zodResolver(createOrganisationSchema),
      defaultValues: {
        name: "",
        website: "",
        phone_number: "",
        phone_country_code: null,
        phone_country_iso: null,
        email: "",
        address_1: "",
        address_line_1: "",
        formatted_address: "",
        address_2: "",
        address_line_2: "",
        street: "",
        city: "",
        state_name: "",
        state_region_province: "",
        postcode: "",
        postal_code: "",
      },
    });

  function syncAddressFields(next: GlobalAddress) {
    setAddress(next);
    setValue("address_1", next.address_line_1 || next.formatted_address, {
      shouldValidate: true,
    });
    setValue("address_line_1", next.address_line_1 || next.formatted_address, {
      shouldValidate: true,
    });
    setValue("formatted_address", next.formatted_address || next.address_line_1, {
      shouldValidate: true,
    });
    setValue("address_2", next.address_line_2 || "", { shouldValidate: true });
    setValue("address_line_2", next.address_line_2 || "", {
      shouldValidate: true,
    });
    setValue("street", next.street || "", { shouldValidate: true });
    setValue("city", next.city || "", { shouldValidate: true });
    setValue("state_region_province", next.state_region_province || "", {
      shouldValidate: true,
    });
    setValue("state_name", next.state_region_province || "", {
      shouldValidate: true,
    });
    setValue("postcode", next.postal_code || "", { shouldValidate: true });
    setValue("postal_code", next.postal_code || "", { shouldValidate: true });
    if (next.country) setValue("country", next.country, { shouldValidate: true });
    if (next.country_code) {
      setValue("country_code", next.country_code, { shouldValidate: true });
    }
  }

  async function onSubmit(values: CreateOrganisationFormValues) {
    setError(null);
    try {
      const addressPayload = hasAddressContent(address)
        ? toAddressApiPayload(address, { includeCoordinates: false })
        : {
            address_1:
              values.address_line_1 ||
              values.address_1 ||
              values.formatted_address ||
              null,
            address_line_1:
              values.address_line_1 ||
              values.address_1 ||
              values.formatted_address ||
              null,
            formatted_address: values.formatted_address || null,
            city: values.city || null,
            postcode: values.postcode || values.postal_code || null,
            country: values.country || null,
            country_code: values.country_code || null,
          };

      const response = await createMutation.mutateAsync({
        name: values.name,
        website: values.website || null,
        phone_number: values.phone_number,
        phone_country_code: values.phone_country_code,
        phone_country_iso: values.phone_country_iso,
        default_country:
          values.country_code || values.phone_country_iso || null,
        default_currency: currencyFromCountryIso(
          values.country_code || values.phone_country_iso || null,
        ),
        email: values.email,
        address: addressPayload,
      });

      const raw = response.data as unknown;
      let user: UserProfile | undefined;
      if (raw && typeof raw === "object") {
        const record = raw as Record<string, unknown>;
        if (record.user && typeof record.user === "object") {
          user = record.user as UserProfile;
        } else if ("id" in record && "email" in record) {
          user = record as unknown as UserProfile;
        }
      }

      if (user && token) {
        await setSession(token, user);
      } else if (user) {
        useAuthStore.setState({ user });
      }

      const orgs = (user?.organisations || []) as OrganisationMembership[];
      const created =
        orgs.find((o) => o.name === values.name) || orgs[orgs.length - 1];

      if (created) {
        await setOrganisation({
          id: created.id,
          code: created.code,
          name: created.name,
          role: getOrganisationRoleCode(created),
        });
        toast.success("Organisation created", created.name);
        navigation.replace("OrgHome", { orgCode: created.code });
      } else {
        toast.success("Organisation created");
        navigation.goBack();
      }
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to create organisation. Please try again.",
      );
      setError(message);
      toast.error("Create failed", message);
    }
  }

  const busy = createMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: c.text }]}>
          Create organisation
        </Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          Set up a new workspace on myTask
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value }, fieldState }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.muted }]}>
                Organisation name
              </Text>
              <TextInput
                autoCapitalize="words"
                style={[
                  styles.input,
                  {
                    borderColor: c.border,
                    backgroundColor: c.surface,
                    color: c.text,
                  },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
                editable={!busy}
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
          name="email"
          render={({ field: { onChange, value }, fieldState }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.muted }]}>
                Contact email
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    borderColor: c.border,
                    backgroundColor: c.surface,
                    color: c.text,
                  },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
                editable={!busy}
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
          name="phone_number"
          render={({ field: { onChange, value }, fieldState }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.muted }]}>
                Phone (E.164, e.g. +61412345678)
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  {
                    borderColor: c.border,
                    backgroundColor: c.surface,
                    color: c.text,
                  },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
                editable={!busy}
              />
              {fieldState.error ? (
                <Text style={[styles.error, { color: c.negative }]}>
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <PlacesAddressInput
          value={address}
          onChange={syncAddressFields}
          label="Address"
        />

        {error ? (
          <Text style={[styles.errorBanner, { color: c.negative }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: c.primary, opacity: busy ? 0.7 : 1 },
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create organisation</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },
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
  errorBanner: { marginBottom: spacing.sm, fontSize: 13 },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
