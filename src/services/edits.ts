import { insertEvent, updateEventTime, voidEvent } from '../db/events';
import type { EventType } from '../types';
import { emitChange } from './bus';

// User corrections. Removed events are voided rather than deleted, so nothing is lost for good.

export async function addManualEvent(type: EventType, timestamp: number): Promise<void> {
  await insertEvent(type, 'MANUAL', timestamp);
  emitChange();
}

export async function changeEventTime(id: number, timestamp: number): Promise<void> {
  await updateEventTime(id, timestamp);
  emitChange();
}

export async function removeEvent(id: number): Promise<void> {
  await voidEvent(id);
  emitChange();
}
