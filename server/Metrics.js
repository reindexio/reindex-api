const libratoEnabled = Boolean(process.env.LIBRATO_USER);

const Metrics = {
  increment(key, value, source) {
    if (libratoEnabled && source) {
      console.log(`source=${source} count#${key}=${value}`);
    }
  },

  sample(key, value, source) {
    if (libratoEnabled && source) {
      console.log(`source=${source} sample#${key}=${value}`);
    }
  },

  measure(key, value, source) {
    if (libratoEnabled && source) {
      console.log(`source=${source} measure#${key}=${value}`);
    }
  },

  measureHrTime(key, value, source) {
    const [seconds, nanoseconds] = value;
    const msec = (seconds * 1000) + (nanoseconds / 1e6);
    if (libratoEnabled && source) {
      Metrics.measure(key, `${msec.toFixed(2)}ms`, source);
    }
    return msec;
  },

  async timing(key, source, createPromise, callback) {
    if (libratoEnabled && source) {
      const start = process.hrtime();
      const result = await Promise.resolve(createPromise());
      const end = process.hrtime(start);
      const msec = Metrics.measureHrTime(key, end, source);
      if (callback) {
        callback(msec);
      }
      return result;
    } else {
      return createPromise();
    }
  },
};

export default Metrics;
