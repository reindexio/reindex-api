const Metrics = {
  increment(key, value, source) {
    console.log(`source=${source} count#${key}=${value}`);
  },
};

export default Metrics;
