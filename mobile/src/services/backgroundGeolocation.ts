/**
 * Background geolocation service — Vue `$BGL` parity.
 *
 * Uses `react-native-background-geolocation` when the native module is linked.
 * Falls back to `@react-native-community/geolocation` + a periodic interval that
 * POSTs to `timesheetActivityApi.sendLocation`, so the app still builds without
 * a paid Transistorsoft license.
 */
import { NativeModules, Platform } from 'react-native';
import { timesheetActivityApi } from '@mytask/api';
import { STORAGE_KEYS } from '@mytask/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import {
  getTrackingOrganisationCode,
  getTrackingUserId,
} from './trackingSession';

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
  onMotionChange?: (cb: (event: unknown) => void) => { remove: () => void };
  onActivityChange?: (cb: (event: unknown) => void) => { remove: () => void };
  onProviderChange?: (cb: (event: unknown) => void) => { remove: () => void };
  onHttp?: (cb: (event: unknown) => void) => { remove: () => void };
  onGeofence?: (cb: (event: unknown) => void) => { remove: () => void };
  LOG_LEVEL_VERBOSE?: number;
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
  watchPosition: (
    success: (position: {
      coords: GeoCoords;
      timestamp: number;
    }) => void,
    error: (error: { message?: string; code?: number }) => void,
    options?: {
      enableHighAccuracy?: boolean;
      distanceFilter?: number;
      interval?: number;
      fastestInterval?: number;
    },
  ) => number;
  clearWatch: (watchId: number) => void;
  requestAuthorization?: () => void;
  setRNConfiguration?: (config: {
    skipPermissionRequests?: boolean;
    authorizationLevel?: 'whenInUse' | 'always' | 'auto';
  }) => void;
};

const FALLBACK_INTERVAL_MS = 60_000;

let nativeBgl: NativeBgl | null | undefined;
let communityGeo: CommunityGeolocation | null | undefined;
let ready = false;
let enabled = false;
let permission: number | string | null = null;
let subscriptions: Array<{ remove: () => void }> = [];
let fallbackWatchId: number | null = null;
let fallbackInterval: ReturnType<typeof setInterval> | null = null;
let lastConfig: BglConfig = {};

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
    // Dynamic require — avoids hard link failure when the package is absent.
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
    // Native module missing or not linked — use fallback.
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
  fcmToken: string | null;
}> {
  const [organisationCode, userId, fcmToken] = await Promise.all([
    getTrackingOrganisationCode(),
    getTrackingUserId(),
    AsyncStorage.getItem(STORAGE_KEYS.fcmToken),
  ]);
  return {
    organisationCode,
    userId,
    fcmToken,
  };
}

function vueParityConfig(overrides: BglConfig = {}): BglConfig {
  return {
    url: sendLocationUrl(),
    params: {
      organisationCode: null,
      userId: null,
      fcmToken: null,
    },
    trackingMode: null,
    debug: false,
    locationAuthorizationRequest: 'Always',
    backgroundPermissionRationale: {
      title:
        "Allow {applicationName} to access this device's location even when closed or not in use.",
      message:
        'myTask uses location tracking for traveling purposes, but does not store your location when disabled.',
      positiveAction: 'Change to "{backgroundPermissionOptionLabel}"',
      negativeAction: 'Cancel',
    },
    distanceFilter: 10,
    stopTimeout: 1,
    heartbeatInterval: 60,
    preventSuspend: true,
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    autoSync: true,
    maxDaysToPersist: 14,
    ...overrides,
  };
}

async function postFallbackLocation(location: BglLocation): Promise<void> {
  const params = await readHttpParams();
  if (!params.organisationCode || !params.userId) {
    return;
  }
  try {
    await timesheetActivityApi.sendLocation({
      location,
      organisationCode: params.organisationCode,
      userId: params.userId,
      fcmToken: params.fcmToken,
    });
  } catch (err) {
    console.warn('[BGL fallback] sendLocation failed', err);
  }
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

function stopFallbackTracking(): void {
  const geo = tryLoadCommunityGeo();
  if (fallbackWatchId != null && geo) {
    geo.clearWatch(fallbackWatchId);
    fallbackWatchId = null;
  }
  if (fallbackInterval != null) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
}

function startFallbackTracking(): void {
  const geo = tryLoadCommunityGeo();
  if (!geo) {
    console.warn('[BGL] No geolocation module available for fallback');
    return;
  }

  stopFallbackTracking();

  const tick = async () => {
    try {
      const loc = await communityGetCurrentPosition(geo);
      await postFallbackLocation(loc);
    } catch (err) {
      console.warn('[BGL fallback] tick failed', err);
    }
  };

  void tick();
  fallbackInterval = setInterval(() => {
    void tick();
  }, FALLBACK_INTERVAL_MS);

  try {
    fallbackWatchId = geo.watchPosition(
      (position) => {
        void postFallbackLocation({
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
      (error) => console.warn('[BGL fallback] watchPosition', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: FALLBACK_INTERVAL_MS,
        fastestInterval: FALLBACK_INTERVAL_MS,
      },
    );
  } catch (err) {
    console.warn('[BGL fallback] watchPosition unavailable', err);
  }
}

/** Vue `BGLSetup` */
export async function setup(): Promise<void> {
  const bgl = tryLoadNativeBgl();
  const params = await readHttpParams();
  const config = vueParityConfig({
    url: sendLocationUrl(),
    params: {
      fcmToken: params.fcmToken,
      organisationCode: params.organisationCode,
      userId: params.userId,
    },
    trackingMode: params.fcmToken ? 1 : null,
  });
  lastConfig = config;

  if (bgl) {
    try {
      subscriptions.forEach((s) => s.remove());
      subscriptions = [];
      if (bgl.onLocation) {
        subscriptions.push(bgl.onLocation(() => undefined));
      }
      if (bgl.onHttp) {
        subscriptions.push(
          bgl.onHttp((event) => console.log('[BGL HTTP]', event)),
        );
      }
      if (typeof bgl.LOG_LEVEL_VERBOSE === 'number') {
        config.logLevel = bgl.LOG_LEVEL_VERBOSE;
      }
      const state = await bgl.ready(config);
      ready = true;
      enabled = Boolean(state?.enabled);
      return;
    } catch (err) {
      console.warn('[BGL] native ready failed, using fallback', err);
    }
  }

  const geo = tryLoadCommunityGeo();
  if (geo?.setRNConfiguration) {
    geo.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: Platform.OS === 'ios' ? 'always' : 'auto',
    });
  }
  ready = true;
  enabled = false;
}

/** Vue `BGLDestroy` */
export async function destroy(): Promise<void> {
  subscriptions.forEach((s) => s.remove());
  subscriptions = [];
  stopFallbackTracking();
  ready = false;
  enabled = false;
}

/** Vue `BGLStart` */
export async function start(): Promise<boolean> {
  try {
    await sync();
    const bgl = tryLoadNativeBgl();
    if (bgl) {
      await bgl.start();
      enabled = true;
      return true;
    }
    startFallbackTracking();
    enabled = true;
    return true;
  } catch (err) {
    console.warn('[BGL] start failed', err);
    return false;
  }
}

/** Vue `BGLStop` */
export async function stop(): Promise<void> {
  try {
    await sync();
    const bgl = tryLoadNativeBgl();
    if (bgl) {
      await bgl.stop();
      await setConfig({ url: null, params: null, trackingMode: null });
    } else {
      stopFallbackTracking();
    }
    enabled = false;
  } catch (err) {
    console.warn('[BGL] stop failed', err);
    enabled = false;
  }
}

/** Vue sync before start/stop */
export async function sync(): Promise<void> {
  const bgl = tryLoadNativeBgl();
  if (!bgl) {
    return;
  }
  try {
    await bgl.sync();
  } catch (err) {
    console.warn('[BGL] sync failed', err);
  }
}

/** Vue `BGLSetConfig` */
export async function setConfig(config: BglConfig): Promise<void> {
  lastConfig = { ...lastConfig, ...config };
  const bgl = tryLoadNativeBgl();
  if (bgl) {
    try {
      await bgl.setConfig(config);
    } catch (err) {
      console.warn('[BGL] setConfig failed', err);
    }
    return;
  }
  // Fallback keeps params in memory for sendLocation posts.
}

/** Vue `BGLGetCurrentLocation` */
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
  if (!geo) {
    return undefined;
  }
  try {
    return await communityGetCurrentPosition(geo);
  } catch (err) {
    console.warn('[BGL fallback] getCurrentPosition failed', err);
    return undefined;
  }
}

/** Vue `BGLRequestPermissions` */
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
  // Community geolocation prompts on first getCurrentPosition.
  try {
    if (geo) {
      await communityGetCurrentPosition(geo);
      permission = 3; // Vue treats 3 as granted (ALWAYS)
    }
  } catch {
    permission = 0;
  }
  return permission;
}

/** Vue `BGLSetGeofences` */
export async function setGeofences(geofences: BglGeofence[]): Promise<void> {
  const bgl = tryLoadNativeBgl();
  if (!bgl) {
    console.warn('[BGL] setGeofences skipped — native module unavailable');
    return;
  }
  try {
    await bgl.addGeofences(geofences);
  } catch (err) {
    console.warn('[BGL] setGeofences failed', err);
  }
}

/** Configure HTTP target after clock-in (Vue startTracking setConfig). */
export async function configureTrackingHttp(params: {
  organisationCode: string;
  userId: string | number;
  fcmToken?: string | null;
}): Promise<void> {
  await setConfig({
    url: sendLocationUrl(),
    params: {
      organisationCode: params.organisationCode,
      userId: params.userId,
      fcmToken: params.fcmToken ?? null,
    },
    trackingMode: 1,
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
