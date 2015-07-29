import RethinkDB from 'rethinkdb';
import {TYPE_TABLE, SECRET_TABLE} from './DBConstants';

export function getApp(context) {
  return RethinkDB.expr({}).merge({
    secrets: getSecrets(context),
    schema: getTypes(context),
  });
}

export function getSecrets({db}) {
  return db.table(SECRET_TABLE).coerceTo('array');
}

export function getTypes({db}) {
  return db.table(TYPE_TABLE).coerceTo('array');
}

export function getAll({db}, table) {
  return db.table(table);
}

export function getById({db}, table, id) {
  return db.table(table).get(id);
}

export function getAllByIndex({db}, table, indexValue, index) {
  return db.table(table).getAll(indexValue, {
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

function compactObject(object) {
  const result = {};
  for (const key of Object.keys(object)) {
    if (object[key] !== undefined) {
      result[key] = object[key];
    }
  }
  return result;
}

export function create({db}, table, data) {
  return db.table(table).insert(compactObject(data), {
    returnChanges: true,
  })('changes')(0)('new_val');
}

export function update({db}, table, id, data) {
  return db.table(table).get(id).update(compactObject(data), {
    returnChanges: true,
  })('changes')(0)('new_val');
}

export function replace({db}, table, id, data) {
  const cleanData = compactObject(data);
  cleanData.id = id;
  return db.table(table).get(id).replace(cleanData, {
    returnChanges: true,
  })('changes')(0)('new_val');
}

export function deleteQuery({db}, table, id) {
  return db.table(table).get(id).delete({
    returnChanges: true,
  })('changes')(0)('old_val');
}
