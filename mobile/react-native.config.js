/**
 * Autolinking config.
 *
 * `react-native-background-geolocation` is autolinked for production tracking
 * (foreground / background / terminated / boot). Follow mobile/docs/TRACKING.md
 * for Transistorsoft CocoaPods / Maven / license setup before `pod install`.
 *
 * `react-native-maps` must stay autolinked on iOS so New Architecture codegen
 * registers Fabric components (RNMapsGoogleMapView, etc.). Google Maps is added
 * via the Podfile Google subspec.
 */
module.exports = {
  dependencies: {},
};
