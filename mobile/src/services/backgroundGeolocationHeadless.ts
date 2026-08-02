/**
 * Transistorsoft headless task — runs when the app is terminated and BGL
 * delivers a location / heartbeat / provider event.
 *
 * HTTP autoSync already POSTs to /timesheet-activity/send-location; this task
 * keeps the plugin lifecycle healthy and can log failures.
 */
import { NativeModules } from 'react-native';

type HeadlessEvent = {
  name?: string;
  params?: unknown;
};

function hasNativeBglModule(): boolean {
  const mods = NativeModules as Record<string, unknown>;
  return Boolean(
    mods.RNBackgroundGeolocation ||
      mods.BackgroundGeolocation ||
      mods.RNBackgroundGeolocationModule,
  );
}

export async function backgroundGeolocationHeadlessTask(
  event: HeadlessEvent,
): Promise<void> {
  if (__DEV__) {
    console.log('[BGL headless]', event?.name, event?.params);
  }
  // Location persistence is handled by plugin HTTP autoSync using configured
  // url + Authorization Bearer tracking token + params (organisationCode, userId).
  // No duplicate POSTs.
}

export function registerBackgroundGeolocationHeadlessTask(): void {
  if (!hasNativeBglModule()) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-background-geolocation') as {
      default?: {
        registerHeadlessTask?: (
          task: (event: HeadlessEvent) => Promise<void>,
        ) => void;
      };
      registerHeadlessTask?: (
        task: (event: HeadlessEvent) => Promise<void>,
      ) => void;
    };
    const api = mod.default ?? mod;
    api.registerHeadlessTask?.(backgroundGeolocationHeadlessTask);
  } catch (err) {
    console.warn('[BGL] headless registration failed', err);
  }
}
