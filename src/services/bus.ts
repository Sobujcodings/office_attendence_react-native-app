// Lets background handlers tell an open UI that attendance data changed.
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitChange(): void {
  listeners.forEach((listener) => listener());
}
