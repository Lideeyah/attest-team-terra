"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onQueueChanged,
  readQueue,
  recoverStranded,
  type QueuedEnrolment,
} from "@/lib/field/queue";

/* One subscription to the queue, so the tab bar's pending count and the queue
   screen read the same store and cannot disagree. */
export function useQueue(): {
  queue: QueuedEnrolment[];
  ready: boolean;
  refresh: () => Promise<void>;
} {
  const [queue, setQueue] = useState<QueuedEnrolment[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    /* Every state change happens in the read's own callback rather than in an
       effect's body: the queue is an external store and this is how it is
       subscribed to. */
    return readQueue()
      .then((rows) => {
        setQueue(rows);
        setReady(true);
      })
      .catch(() => {
        /* A browser with no IndexedDB — a private window on an old phone —
           still renders the app; it just cannot queue. */
        setQueue([]);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    let live = true;
    const read = () => {
      void recoverStranded()
        .catch(() => 0)
        .then(() => readQueue())
        .then((rows) => {
          if (!live) {
            return;
          }
          setQueue(rows);
          setReady(true);
        })
        .catch(() => {
          if (!live) {
            return;
          }
          setQueue([]);
          setReady(true);
        });
    };
    read();
    const stop = onQueueChanged(read);
    return () => {
      live = false;
      stop();
    };
  }, []);

  return { queue, ready, refresh };
}

/** Whether the phone thinks it has a connection. Offline is the normal case,
    so this is read continuously rather than assumed. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
