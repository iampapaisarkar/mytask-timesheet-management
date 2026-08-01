import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import type { OrgStackParamList } from "./types";

type OrgNavigate = {
  <Name extends keyof OrgStackParamList>(
    screen: Name,
    params: OrgStackParamList[Name],
  ): void;
};

/**
 * Navigate to org-level standalone screens from nested tab/stack screens.
 * Named navigations bubble to the parent OrgStack navigator.
 */
export function useOrgNavigate(): OrgNavigate {
  const navigation = useNavigation();

  return useCallback(
    (screen, params) => {
      (
        navigation.navigate as (
          screen: keyof OrgStackParamList,
          params: OrgStackParamList[keyof OrgStackParamList],
        ) => void
      )(screen, params);
    },
    [navigation],
  ) as OrgNavigate;
}
