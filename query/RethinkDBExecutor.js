import RethinkDB from 'rethinkdb';

const RethinkDBExecutor = {
  async executeQuery(connection, dbName, query) {
    const reQLQuery = query.query.toRQL(RethinkDB, RethinkDB.db(dbName));
    return await reQLQuery.run(connection);
  },
};
export default RethinkDBExecutor;
