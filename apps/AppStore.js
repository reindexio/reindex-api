import getApp from './getApp';

const AppStore = {
  async getByHostname(conn, hostname) {
    const dbName = hostname.split('.')[0];
    return await getApp(dbName, conn);
  },
};

export default AppStore;
