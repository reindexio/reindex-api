import App from './App';
import {Schema} from '../schema/schema';

const AppStore = {
  async getByHostname(hostname) {
    // TODO(fson, 2015-04-13): Stub.
    const dbName = hostname.split('.')[0];
    const schema = new Schema();
    return new App({dbName, schema});
  },
};

export default AppStore;
