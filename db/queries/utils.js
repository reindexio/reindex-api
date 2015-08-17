import RethinkDB from 'rethinkdb';

export function queryWithIDs(type, query) {
  return query.merge((obj) => ({
    id: {
      type,
      value: obj('id'),
    },
  }));
}

export function getFirstOrNullQuery(query) {
  return RethinkDB.branch(query.isEmpty(), null, query(0));
}
