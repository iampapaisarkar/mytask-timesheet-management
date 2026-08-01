/**
 * Autolinking config.
 *
 * `react-native-background-geolocation` is installed for the JS API surface, but
 * native linking is disabled by default so DEBUG/RELEASE builds do not require
 * the private TSLocationManager CocoaPods source or a Transistorsoft license.
 * Enable native linking when ready — see mobile/docs/TRACKING.md.
 *
 * `react-native-maps` iOS is linked manually via Podfile (`react-native-maps/Google`)
 * so Apple Maps is not used. Android still autolinks (Google Maps).
 */
module.exports = {
  dependencies: {
    'react-native-background-geolocation': {
      platforms: {
        ios: null,
        android: null,
      },
    },
    'react-native-maps': {
      platforms: {
        ios: null,
      },
    },
  },
};
