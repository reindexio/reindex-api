let newrelic;
if (process.env.NEW_RELIC_APP_NAME) {
  newrelic = require('newrelic');
}

let logging = true;

const Monitoring = {
  setTransactionName(name) {
    if (newrelic) {
      newrelic.setTransactionName(name);
    }
    if (logging) {
      console.log(`Transaction: ${name}`);
    }
  },
  addCustomParameter(name, value) {
    if (newrelic) {
      newrelic.addCustomParameter(name, value);
    }
    if (logging) {
      console.log(`Transaction parameter ${name}: ${JSON.stringify(value)}`);
    }
  },
  noticeError(error, customParameters) {
    if (newrelic) {
      newrelic.noticeError(error, customParameters);
    }
    if (logging) {
      console.error(error.stack);
      if (customParameters) {
        console.error(customParameters);
      }
    }
  },
  setIgnoreTransaction(ignored) {
    if (newrelic) {
      newrelic.setIgnoreTransaction(ignored);
    }
  },
  setLogging(value) {
    logging = value;
  },
};

export default Monitoring;
