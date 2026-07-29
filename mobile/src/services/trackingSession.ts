import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_ORG_KEY = 'trackingOrganisationCode';
const TRACKING_USER_KEY = 'trackingUserId';

export type TrackingSession = {
  organisationCode: string;
  userId: string | number;
};

export async function getTrackingSession(): Promise<TrackingSession | null> {
  const [[, organisationCode], [, userId]] = await AsyncStorage.multiGet([
    TRACKING_ORG_KEY,
    TRACKING_USER_KEY,
  ]);
  if (!organisationCode || !userId) {
    return null;
  }
  return { organisationCode, userId };
}

export async function setTrackingSession(
  organisationCode: string,
  userId: string | number,
): Promise<void> {
  await AsyncStorage.multiSet([
    [TRACKING_ORG_KEY, organisationCode],
    [TRACKING_USER_KEY, String(userId)],
  ]);
}

export async function clearTrackingSession(): Promise<void> {
  await AsyncStorage.multiRemove([TRACKING_ORG_KEY, TRACKING_USER_KEY]);
}

/** True when a tracking session is persisted (start without stop). */
export async function isTracking(): Promise<boolean> {
  const session = await getTrackingSession();
  return session != null;
}

/**
 * Block switching to another organisation while tracking a different one.
 * Returns true when the switch should be blocked.
 */
export async function blockOrgSwitch(
  targetOrganisationCode: string,
): Promise<boolean> {
  const session = await getTrackingSession();
  if (!session) {
    return false;
  }
  return session.organisationCode !== targetOrganisationCode;
}

export async function getTrackingOrganisationCode(): Promise<string | null> {
  return AsyncStorage.getItem(TRACKING_ORG_KEY);
}

export async function getTrackingUserId(): Promise<string | null> {
  return AsyncStorage.getItem(TRACKING_USER_KEY);
}
