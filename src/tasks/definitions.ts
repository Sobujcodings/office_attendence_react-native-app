import * as BackgroundTask from 'expo-background-task';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GEOFENCE_TASK, RECONCILE_TASK } from '../constants';
import { handleSignal, reconcile } from '../services/attendance';

interface GeofenceTaskData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

TaskManager.defineTask<GeofenceTaskData>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) {
    if (error) console.warn('[geofence task]', error.message);
    return;
  }
  try {
    await handleSignal({
      kind: data.eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT',
      source: 'GPS',
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[geofence task]', err);
  }
});

TaskManager.defineTask(RECONCILE_TASK, async () => {
  try {
    await reconcile();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (err) {
    console.warn('[reconcile task]', err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
