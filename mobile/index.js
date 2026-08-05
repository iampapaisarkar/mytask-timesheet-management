/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundGeolocationHeadlessTask } from './src/services/backgroundGeolocationHeadless';
import { registerBackgroundMessageHandler } from './src/services/pushNotifications';

// Must register before AppRegistry so killed-state data messages don't crash JS.
registerBackgroundMessageHandler();
registerBackgroundGeolocationHeadlessTask();

AppRegistry.registerComponent(appName, () => App);
