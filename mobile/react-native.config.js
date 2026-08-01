/**
 * Autolinking config.
 *
 * `react-native-background-geolocation` is installed for the JS API surface, but
 * native linking is disabled by default so DEBUG/RELEASE builds do not require
 * the private TSLocationManager CocoaPods source or a Transistorsoft license.
 * Enable native linking when ready — see mobile/docs/TRACKING.md.
 *
 * `react-native-maps` must stay autolinked on iOS so New Architecture codegen
 * registers Fabric components (RNMapsGoogleMapView, etc.). Google Maps is added
 * via the Podfile Google subspec.
 */
module.exports = {
  dependencies: {
    'react-native-background-geolocation': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
