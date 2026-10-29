import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { RECONCILE_INTERVAL_MIN, RECONCILE_TASK } from '../constants';

/** Schedules the periodic WiFi/location check (survives reboot via WorkManager). */
export async function registerReconcileTask(): Promise<boolean> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  if (!(await TaskManager.isTaskRegisteredAsync(RECONCILE_TASK))) {
    await BackgroundTask.registerTaskAsync(RECONCILE_TASK, { minimumInterval: RECONCILE_INTERVAL_MIN });
  }
  return true;
}
