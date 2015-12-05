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

export function isValidID(type, id) {
  if (!id) {
    return false;
  }
  if (id.type !== type) {
    return false;
  }
  if (id.value.length !== 36) {
    return false;
  }
  return true;
}
