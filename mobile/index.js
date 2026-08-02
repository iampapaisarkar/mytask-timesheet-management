/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundGeolocationHeadlessTask } from './src/services/backgroundGeolocationHeadless';

registerBackgroundGeolocationHeadlessTask();

AppRegistry.registerComponent(appName, () => App);
