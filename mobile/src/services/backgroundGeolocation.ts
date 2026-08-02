/**
 * Background geolocation — Transistorsoft official path.
 *
 * Continuous tracking uses react-native-background-geolocation HTTP autoSync
 * (distanceFilter + motion/stationary). No polling timers.
 *
 * When the native module is not linked, start() fails with a clear error so we
 * never fall back to fake interval tracking.
 */
import { NativeModules, Platform } from 'react-native';
import { ENV } from '../config/env';
import {
  getTrackingOrganisationCode,
  getTrackingUserId,
} from './trackingSession';
import { getTrackingToken } from './trackingAuthToken';

export type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
};

export type BglLocation = {
  coords: GeoCoords;
  timestamp?: string | number;
  [key: string]: unknown;
};

export type BglConfig = Record<string, unknown>;

export type BglGeofence = {
  identifier: string;
  radius: number;
  latitude: number;
  longitude: number;
  notifyOnEntry?: boolean;
  notifyOnExit?: boolean;
  [key: string]: unknown;
};

type NativeBgl = {
  ready: (config: BglConfig) => Promise<{ enabled?: boolean }>;
  start: () => Promise<unknown>;
  stop: () => Promise<unknown>;
  sync: () => Promise<unknown>;
  setConfig: (config: BglConfig) => Promise<unknown>;
  getCurrentPosition: (opts?: BglConfig) => Promise<BglLocation>;
  requestPermission: () => Promise<number | string>;
  addGeofences: (geofences: BglGeofence[]) => Promise<unknown>;
  removeGeofences: () => Promise<unknown>;
  onLocation?: (cb: (loc: BglLocation) => void) => { remove: () => void };
  onHttp?: (cb: (event: unknown) => void) => { remove: () => void };
  onProviderChange?: (cb: (event: unknown) => void) => { remove: () => void };
  onMotionChange?: (cb: (event: unknown) => void) => { remove: () => void };
  registerHeadlessTask?: (task: (event: unknown) => Promise<void>) => void;
  DESIRED_ACCURACY_HIGH?: number;
  LOG_LEVEL_VERBOSE?: number;
  LOG_LEVEL_WARNING?: number;
  AUTHORIZATION_STATUS_ALWAYS?: number;
};

type CommunityGeolocation = {
  getCurrentPosition: (
    success: (position: {
      coords: GeoCoords;
      timestamp: number;
    }) => void,
    error: (error: { message?: string; code?: number }) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    },
  ) => void;
  requestAuthorization?: () => void;
  setRNConfiguration?: (config: {
    skipPermissionRequests?: boolean;
    authorizationLevel?: 'whenInUse' | 'always' | 'auto';
  }) => void;
};

let nativeBgl: NativeBgl | null | undefined;
let communityGeo: CommunityGeolocation | null | undefined;
let ready = false;
let enabled = false;
let permission: number | string | null = null;
let subscriptions: Array<{ remove: () => void }> = [];
let lastConfig: BglConfig = {};

export class BackgroundGeolocationUnavailableError extends Error {
  code = 'BGL_NATIVE_UNAVAILABLE';
  constructor(
    message = 'Background location tracking requires the native Transistorsoft module. Enable linking and rebuild the app.',
  ) {
    super(message);
    this.name = 'BackgroundGeolocationUnavailableError';
  }
}

function sendLocationUrl(): string {
  const base = ENV.API_BASE_URL.replace(/\/$/, '');
  return `${base}/timesheet-activity/send-location`;
}

function hasNativeBglModule(): boolean {
  const mods = NativeModules as Record<string, unknown>;
  return Boolean(
    mods.RNBackgroundGeolocation ||
      mods.BackgroundGeolocation ||
      mods.RNBackgroundGeolocationModule,
  );
}

function tryLoadNativeBgl(): NativeBgl | null {
  if (nativeBgl !== undefined) {
    return nativeBgl;
  }
  if (!hasNativeBglModule()) {
    nativeBgl = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-background-geolocation') as {
      default?: NativeBgl;
    } & NativeBgl;
    const api = (mod.default ?? mod) as NativeBgl;
    if (api && typeof api.ready === 'function') {
      nativeBgl = api;
      return nativeBgl;
    }
  } catch {
    // Native module missing
  }
  nativeBgl = null;
  return null;
}

function tryLoadCommunityGeo(): CommunityGeolocation | null {
  if (communityGeo !== undefined) {
    return communityGeo;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-community/geolocation') as {
      default?: CommunityGeolocation;
    } & CommunityGeolocation;
    communityGeo = (mod.default ?? mod) as CommunityGeolocation;
    return communityGeo;
  } catch {
    communityGeo = null;
    return null;
  }
}

export function isNativeBglAvailable(): boolean {
  return tryLoadNativeBgl() != null;
}

export function isBglReady(): boolean {
  return ready;
}

export function isBglEnabled(): boolean {
  return enabled;
}

export function getBglPermission(): number | string | null {
  return permission;
}

async function readHttpParams(): Promise<{
  organisationCode: string | null;
  userId: string | null;
}> {
  const [organisationCode, userId] = await Promise.all([
    getTrackingOrganisationCode(),
    getTrackingUserId(),
  ]);
  return { organisationCode, userId };
}

async function trackingAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getTrackingToken();
    if (!token || !token.startsWith('mttrk_')) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

/** Official Transistorsoft recommended battery-aware config. */
function transistorConfig(overrides: BglConfig = {}): BglConfig {
  const bgl = tryLoadNativeBgl();
  return {
    url: sendLocationUrl(),
    params: {
      organisationCode: null,
      userId: null,
    },
    headers: {},
    method: 'POST',
    autoSync: true,
    autoSyncThreshold: 0,
    batchSync: false,
    maxBatchSize: 50,
    maxDaysToPersist: 14,
    maxRecordsToPersist: 1000,
    locationsOrderDirection: 'ASC',
    desiredAccuracy: bgl?.DESIRED_ACCURACY_HIGH ?? 0,
    distanceFilter: 20,
    stopTimeout: 5,
    stationaryRadius: 25,
    disableElasticity: false,
    heartbeatInterval: 60,
    preventSuspend: true,
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    foregroundService: true,
    notification: {
      title: 'myTask tracking',
      text: 'Recording timesheet location',
      sticky: true,
    },
    locationAuthorizationRequest: 'Always',
    backgroundPermissionRationale: {
      title:
        "Allow {applicationName} to access this device's location even when closed or not in use.",
      message:
        'myTask uses location while you are clocked in to detect travel and work at assigned job sites.',
      positiveAction: 'Change to "{backgroundPermissionOptionLabel}"',
      negativeAction: 'Cancel',
    },
    debug: false,
    logLevel: bgl?.LOG_LEVEL_WARNING ?? 2,
    ...overrides,
  };
}

function communityGetCurrentPosition(
  geo: CommunityGeolocation,
): Promise<BglLocation> {
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
            timestamp: position.timestamp,
          },
          timestamp: position.timestamp,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 30_000,
        maximumAge: 5_000,
      },
    );
  });
}

export async function setup(): Promise<void> {
  const bgl = tryLoadNativeBgl();
  const params = await readHttpParams();
  const headers = await trackingAuthHeaders();
  const config = transistorConfig({
    url: sendLocationUrl(),
    headers,
    params: {
      organisationCode: params.organisationCode,
      userId: params.userId,
    },
  });
  lastConfig = config;

  if (!bgl) {
    const geo = tryLoadCommunityGeo();
    if (geo?.setRNConfiguration) {
      geo.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: Platform.OS === 'ios' ? 'always' : 'auto',
      });
    }
    ready = true;
    enabled = false;
    return;
  }

  try {
    subscriptions.forEach((s) => s.remove());
    subscriptions = [];
    if (bgl.onHttp) {
      subscriptions.push(
        bgl.onHttp((event) => {
          if (__DEV__) {
            console.log('[BGL HTTP]', event);
          }
        }),
      );
    }
    if (bgl.onProviderChange) {
      subscriptions.push(
        bgl.onProviderChange((event) => {
          if (__DEV__) {
            console.log('[BGL provider]', event);
          }
        }),
      );
    }
    const state = await bgl.ready(config);
    ready = true;
    enabled = Boolean(state?.enabled);
  } catch (err) {
    console.warn('[BGL] ready failed', err);
    ready = false;
    enabled = false;
    throw err;
  }
}

export async function destroy(): Promise<void> {
  subscriptions.forEach((s) => s.remove());
  subscriptions = [];
  ready = false;
  enabled = false;
}

export async function start(): Promise<boolean> {
  const bgl = tryLoadNativeBgl();
  if (!bgl) {
    throw new BackgroundGeolocationUnavailableError();
  }
  try {
    await sync();
    await bgl.start();
    enabled = true;
    return true;
  } catch (err) {
    console.warn('[BGL] start failed', err);
    enabled = false;
    throw err;
  }
}

export async function stop(): Promise<void> {
  try {
    await sync();
    const bgl = tryLoadNativeBgl();
    if (bgl) {
      await bgl.stop();
      await setConfig({ url: undefined, params: undefined });
    }
    enabled = false;
  } catch (err) {
    console.warn('[BGL] stop failed', err);
    enabled = false;
  }
}

export async function sync(): Promise<void> {
  const bgl = tryLoadNativeBgl();
  if (!bgl) return;
  try {
    await bgl.sync();
  } catch (err) {
    console.warn('[BGL] sync failed', err);
  }
}

export async function setConfig(config: BglConfig): Promise<void> {
  lastConfig = { ...lastConfig, ...config };
  const bgl = tryLoadNativeBgl();
  if (!bgl) return;
  try {
    await bgl.setConfig(config);
  } catch (err) {
    console.warn('[BGL] setConfig failed', err);
  }
}

export async function getCurrentPosition(): Promise<BglLocation | undefined> {
  const bgl = tryLoadNativeBgl();
  if (bgl) {
    try {
      return await bgl.getCurrentPosition({
        timeout: 30,
        maximumAge: 5_000,
        desiredAccuracy: 10,
        samples: 1,
      });
    } catch (err) {
      console.warn('[BGL] getCurrentPosition failed', err);
    }
  }

  const geo = tryLoadCommunityGeo();
  if (!geo) return undefined;
  try {
    return await communityGetCurrentPosition(geo);
  } catch (err) {
    console.warn('[BGL] community getCurrentPosition failed', err);
    return undefined;
  }
}

export async function requestPermissions(): Promise<number | string | null> {
  const bgl = tryLoadNativeBgl();
  if (bgl) {
    try {
      permission = await bgl.requestPermission();
      return permission;
    } catch (err) {
      console.warn('[BGL] requestPermission failed', err);
    }
  }

  const geo = tryLoadCommunityGeo();
  if (geo?.requestAuthorization) {
    geo.requestAuthorization();
  }
  try {
    if (geo) {
      await communityGetCurrentPosition(geo);
      permission = 3;
    }
  } catch {
    permission = 0;
  }
  return permission;
}

export async function setGeofences(geofences: BglGeofence[]): Promise<void> {
  const bgl = tryLoadNativeBgl();
  if (!bgl) return;
  try {
    await bgl.removeGeofences();
    if (geofences.length > 0) {
      await bgl.addGeofences(geofences);
    }
  } catch (err) {
    console.warn('[BGL] setGeofences failed', err);
  }
}

export async function configureTrackingHttp(params: {
  organisationCode: string;
  userId: string | number;
  trackingToken: string;
}): Promise<void> {
  await setConfig({
    url: sendLocationUrl(),
    headers: {
      Authorization: `Bearer ${params.trackingToken}`,
    },
    params: {
      organisationCode: params.organisationCode,
      userId: params.userId,
    },
  });
}

export const backgroundGeolocation = {
  setup,
  destroy,
  start,
  stop,
  sync,
  setConfig,
  getCurrentPosition,
  requestPermissions,
  setGeofences,
  configureTrackingHttp,
  isNativeBglAvailable,
  isBglReady,
  isBglEnabled,
  getBglPermission,
};

export default backgroundGeolocation;
