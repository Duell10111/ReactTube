export function playbackClock() {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  return {
    timers,
    now: () => now,
    setTimer(callback, delay) {
      const id = ++nextId;
      timers.set(id, {callback, due: now + delay});
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const next = [...timers.entries()].sort(
          (a, b) => a[1].due - b[1].due,
        )[0];
        if (!next || next[1].due > end) break;
        now = next[1].due;
        timers.delete(next[0]);
        next[1].callback();
      }
      now = end;
    },
  };
}

export async function flushPlayback() {
  for (let index = 0; index < 40; index++) await Promise.resolve();
}

export function deferredPlayback() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}
