let Metrics;
if (process.env.NODE_ENV === 'production') {
  Metrics = {
    increment(key, value, source) {
      console.log(`source=${source} count#${key}=${value}`);
    },
  };
} else {
  Metrics = {
    increment() {},
  };
}

export default Metrics;
