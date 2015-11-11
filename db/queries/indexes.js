import uuid from 'uuid';
import { find, isEqual, isString } from 'lodash';
import RethinkDB from 'rethinkdb';

import {
  INDEX_TABLE,
} from '../DBTableNames';


// RethinkDB get an array of values, given a possibly nested list of
// accesor keys. Like immutable .map((keys) => o.getIn([...keys])
export function getIndexValue(obj, fields) {
  return fields.map((part) => {
    if (isString(part)) {
      return obj(part);
    } else {
      return part.reduce((chain, next) => chain(next), obj);
    }
  });
}

const ID_FIELDS = [['id']];

// Find an index by fields, unless it's a primary key index
export function getIndexFromFields(indexes, fields) {
  if (isEqual(ID_FIELDS, fields)) {
    return {
      name: 'id',
      fields: ID_FIELDS,
    };
  } else {
    return find(indexes, (index) => isEqual(fields, index.fields));
  }
}

export async function ensureIndex(conn, type, fields) {
  const name = uuid.v4();
  // TODO(freiksenet, 2015-08-17): Fails if you try to create indexes
  // concurrently
  await RethinkDB.table(type).indexCreate(name, (obj) => (
    getIndexValue(obj, fields)
  )).run(conn);
  await RethinkDB.do(
    RethinkDB.table(type).indexWait(name),
    () => RethinkDB.table(INDEX_TABLE).insert({
      type,
      name,
      fields,
    })
  ).run(conn);

  return {
    name,
    type,
    fields,
  };
}

// Convert a cursor to either a valid RethinkDB value or a RethinkDB query
// that can be used as index key
//
// Parameters:
//
// * `type` - type we are querying
// * `index` - index we are querying
// * `cursor` - Cursor or null
// * `keyPrefix` - Arrray of known index values
// * `paddingSize` - count of unknown index values of the key
// * `defaultValue` - default value to use for unknown values of the key
//   (usually r.minval/r.maxval)
export function cursorToIndexKey(
  type,
  index,
  cursor,
  keyPrefix,
  paddingSize,
  defaultValue,
) {
  if (cursor) {
    // Valid cursor is always enough, we retrieve the object it points to
    // to get between data
    return RethinkDB.do(
      RethinkDB.table(type).get(cursor.value),
      (result) => RethinkDB.branch(
        result,
        getIndexValue(result, index.fields),
        defaultValue
      )
    );
  } else if (keyPrefix) {
    // No cursor passed, we create between data from data we already have
    // and pad the unavailable values with base (either minval or maxval)
    return [
      ...keyPrefix,
      ...(new Array(paddingSize).fill(defaultValue)),
    ];
  } else {
    return defaultValue;
  }
}
