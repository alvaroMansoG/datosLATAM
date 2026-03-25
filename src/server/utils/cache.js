function createTimedStore() {
  return new Map();
}

function getTimedCache(store, key, ttl) {
  const entry = store.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.data;
  return null;
}

function setTimedCache(store, key, data) {
  store.set(key, { data, ts: Date.now() });
}

function createMemoryCache(ttl) {
  const store = new Map();

  return {
    get(key) {
      return getTimedCache(store, key, ttl);
    },
    set(key, data) {
      setTimedCache(store, key, data);
    },
    clear() {
      store.clear();
    },
    store,
  };
}

module.exports = {
  createMemoryCache,
  createTimedStore,
  getTimedCache,
  setTimedCache,
};
