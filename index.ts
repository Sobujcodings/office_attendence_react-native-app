// Background tasks must be defined before the app registers, so the OS can
// wake the JS runtime and run them even when the UI is closed.
import './src/tasks/definitions';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
