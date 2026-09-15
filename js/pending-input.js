// Each field is captured when typed. Switching fields cannot replace an unsaved value.
export function createPendingInputWriter(write, delay = 220) {
  const pending = new Map();
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    const values = [...pending.values()];
    pending.clear();
    values.forEach(write);
  };
  const enqueue = (target) => {
    const dataset = { ...target.dataset };
    const key = [dataset.action, dataset.exercise, dataset.set, dataset.field].join(':');
    pending.set(key, { dataset, value: target.value });
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };
  enqueue.flush = flush;
  enqueue.cancel = () => { clearTimeout(timer); timer = null; pending.clear(); };
  return enqueue;
}
