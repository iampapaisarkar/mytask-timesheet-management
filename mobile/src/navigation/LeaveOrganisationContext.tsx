import { createContext, useContext } from "react";

const LeaveOrganisationContext = createContext<() => void>(() => undefined);

export const LeaveOrganisationProvider = LeaveOrganisationContext.Provider;

export function useLeaveOrganisation() {
  return useContext(LeaveOrganisationContext);
}
