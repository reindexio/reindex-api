let newrelic;
if (process.env.NEW_RELIC_APP_NAME) {
  newrelic = require('newrelic');
}

const Monitoring = {
  setTransactionName(name) {
    if (newrelic) {
      newrelic.setTransactionName(name);
    }
    console.log(`Transaction: ${name}`);
  },
  addCustomParameter(name, value) {
    if (newrelic) {
      newrelic.addCustomParameter(name, value);
    }
    console.log(`Transaction parameter ${name}: ${JSON.stringify(value)}`);
  },
  noticeError(error, customParameters) {
    if (newrelic) {
      newrelic.noticeError(error, customParameters);
    }
    console.error(error);
    console.error(error.stack);
    console.error(customParameters);
  },
};

export default Monitoring;
