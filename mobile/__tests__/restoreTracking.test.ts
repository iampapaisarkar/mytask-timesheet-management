/**
 * Lifecycle tests for native tracking restore (iOS force-quit / reopen).
 * Covers: foreground (already enabled), terminate (enabled false → start),
 * and no-session / unavailable paths used after background/terminate.
 */
jest.mock('../src/services/backgroundGeolocation', () => ({
  __esModule: true,
  default: {
    isNativeBglAvailable: jest.fn(),
    setup: jest.fn(),
    configureTrackingHttp: jest.fn(),
    refreshEnabledFromNative: jest.fn(),
    requestPermissions: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    sync: jest.fn(),
    isBglEnabled: jest.fn(),
  },
}));

jest.mock('../src/services/trackingSession', () => ({
  getTrackingSession: jest.fn(),
  setTrackingSession: jest.fn(),
  clearTrackingSession: jest.fn(),
}));

jest.mock('../src/services/trackingAuthToken', () => ({
  ensureTrackingToken: jest.fn(),
}));

import backgroundGeolocation from '../src/services/backgroundGeolocation';
import {
  getTrackingSession,
  setTrackingSession,
  clearTrackingSession,
} from '../src/services/trackingSession';
import { ensureTrackingToken } from '../src/services/trackingAuthToken';
import {
  restoreNativeTrackingIfNeeded,
  alignTrackingWithServerStatus,
} from '../src/services/restoreTracking';

const bgl = backgroundGeolocation as jest.Mocked<typeof backgroundGeolocation>;
const getSession = getTrackingSession as jest.MockedFunction<
  typeof getTrackingSession
>;
const setSession = setTrackingSession as jest.MockedFunction<
  typeof setTrackingSession
>;
const clearSession = clearTrackingSession as jest.MockedFunction<
  typeof clearTrackingSession
>;
const ensureToken = ensureTrackingToken as jest.MockedFunction<
  typeof ensureTrackingToken
>;

const session = { organisationCode: 'ORG1', userId: 42 };

beforeEach(() => {
  jest.clearAllMocks();
  bgl.isNativeBglAvailable.mockReturnValue(true);
  ensureToken.mockResolvedValue('mttrk_test_token');
  bgl.setup.mockResolvedValue(undefined);
  bgl.configureTrackingHttp.mockResolvedValue(undefined);
  bgl.requestPermissions.mockResolvedValue(3);
  bgl.start.mockResolvedValue(true);
  bgl.stop.mockResolvedValue(undefined);
  bgl.sync.mockResolvedValue(undefined);
});

describe('restoreNativeTrackingIfNeeded', () => {
  it('foreground: already enabled → sync only, no start', async () => {
    getSession.mockResolvedValue(session);
    bgl.refreshEnabledFromNative.mockResolvedValue(true);

    const result = await restoreNativeTrackingIfNeeded();

    expect(result).toEqual({ restored: false, reason: 'already_enabled' });
    expect(bgl.configureTrackingHttp).toHaveBeenCalledWith({
      organisationCode: 'ORG1',
      userId: 42,
      trackingToken: 'mttrk_test_token',
    });
    expect(bgl.start).not.toHaveBeenCalled();
    expect(bgl.sync).toHaveBeenCalled();
  });

  it('after terminate: enabled false → start again', async () => {
    getSession.mockResolvedValue(session);
    bgl.refreshEnabledFromNative.mockResolvedValue(false);

    const result = await restoreNativeTrackingIfNeeded();

    expect(result).toEqual({ restored: true, reason: 'started' });
    expect(bgl.requestPermissions).toHaveBeenCalled();
    expect(bgl.start).toHaveBeenCalled();
    expect(bgl.sync).not.toHaveBeenCalled();
  });

  it('background session missing → no_session', async () => {
    getSession.mockResolvedValue(null);

    const result = await restoreNativeTrackingIfNeeded();

    expect(result).toEqual({ restored: false, reason: 'no_session' });
    expect(bgl.start).not.toHaveBeenCalled();
  });

  it('native unavailable → native_unavailable', async () => {
    bgl.isNativeBglAvailable.mockReturnValue(false);

    const result = await restoreNativeTrackingIfNeeded();

    expect(result).toEqual({ restored: false, reason: 'native_unavailable' });
  });
});

describe('alignTrackingWithServerStatus', () => {
  it('server running after terminate (no local session) → recreate + start', async () => {
    getSession.mockResolvedValue(null);
    bgl.refreshEnabledFromNative.mockResolvedValue(false);
    // After setTrackingSession, restore reads the new session
    getSession
      .mockResolvedValueOnce(null)
      .mockResolvedValue(session);

    const result = await alignTrackingWithServerStatus({
      organisationCode: 'ORG1',
      userId: 42,
      timer: 'running',
    });

    expect(setSession).toHaveBeenCalledWith('ORG1', 42);
    expect(result?.restored).toBe(true);
    expect(result?.reason).toBe('started');
  });

  it('server pause with matching session + enabled → sync', async () => {
    getSession.mockResolvedValue(session);
    bgl.refreshEnabledFromNative.mockResolvedValue(true);

    const result = await alignTrackingWithServerStatus({
      organisationCode: 'ORG1',
      userId: 42,
      timer: 'pause',
    });

    expect(setSession).not.toHaveBeenCalled();
    expect(result?.reason).toBe('already_enabled');
    expect(bgl.sync).toHaveBeenCalled();
  });

  it('server stop with matching session → clear + stop native', async () => {
    getSession.mockResolvedValue(session);

    const result = await alignTrackingWithServerStatus({
      organisationCode: 'ORG1',
      userId: 42,
      timer: 'stop',
    });

    expect(clearSession).toHaveBeenCalled();
    expect(bgl.stop).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
