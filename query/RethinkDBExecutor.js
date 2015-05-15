import RethinkDB from 'rethinkdb';

const RethinkDBExecutor = {
  async executeQuery(conn, app, query) {
    const reQLQuery = query.toReQL(RethinkDB.db(app.dbName));
    return await reQLQuery.run(conn);
  },
};
export default RethinkDBExecutor;
