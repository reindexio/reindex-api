import {TYPE_TABLE} from '../query/QueryConstants';

export default function createSchema(db) {
  return db
    .tableCreate(TYPE_TABLE, {primaryKey: 'name'});
}
