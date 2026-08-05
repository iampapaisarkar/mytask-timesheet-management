/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundGeolocationHeadlessTask } from './src/services/backgroundGeolocationHeadless';
import { registerBackgroundMessageHandler } from './src/services/pushNotifications';

// Hide yellow LogBox banners for client demos / day-to-day use.
// Red fatal errors still surface in Metro / native logs.
LogBox.ignoreAllLogs(true);

// Must register before AppRegistry so killed-state data messages don't crash JS.
registerBackgroundMessageHandler();
registerBackgroundGeolocationHeadlessTask();

AppRegistry.registerComponent(appName, () => App);
