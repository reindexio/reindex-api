import RethinkDB from 'rethinkdb';
import {TYPE_TABLE, SECRET_TABLE} from './DBConstants';

export function getApp(context) {
  return RethinkDB.expr({}).merge({
    secrets: getSecrets(context),
    schema: getTypes(context),
  });
}

export function getSecrets(context) {
  return context.db.table(SECRET_TABLE).coerceTo('array');
}

export function getTypes(context) {
  return context.db.table(TYPE_TABLE).coerceTo('array');
}

export function getAll(context, table) {
  return context.db.table(table);
}

export function getById(context, table, id) {
  return context.db.table(table).get(id);
}

export function getAllByIndex(context, table, indexValue, index) {
  return context.db.table(table).getAll(indexValue, {
    index,
  });
}

export function getCount(query) {
  return query.count();
}

export function getNodes(query) {
  return query.coerceTo('array');
}

export function getEdges(query) {
  return query.map((node) => ({ node })).coerceTo('array');
}

export function processConnectionQuery(query, {
  first, after, orderBy,
}) {
  let paginatedQuery;
  if (orderBy) {
    let op = RethinkDB.asc;
    if (orderBy.startsWith('-')) {
      orderBy = orderBy.slice(1);
      op = RethinkDB.desc;
    }
    query = query.orderBy(op(orderBy));
  }

  if (first || after) {
    let slice = [after || 0];
    if (first) {
      slice = [slice[0], slice[0] + first];
    }
    paginatedQuery = query.slice(...slice);
  }

  return {
    query,
    paginatedQuery: paginatedQuery || query,
  };
}
