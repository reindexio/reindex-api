import RethinkDB from 'rethinkdb';

import App from './App';
import getSchema from '../schema/getSchema';

const AppStore = {
  async getByHostname(conn, hostname) {
    const dbName = hostname.split('.')[0];
    const schema = await getSchema(RethinkDB.db(dbName), conn);
    return new App({dbName, schema});
  },
};

export default AppStore;
