import {Record} from 'immutable';
import RethinkDB from 'rethinkdb';

import {TYPE_TABLE} from '../QueryConstants';

export default class AddTypeMutator extends Record({
  name: undefined,
}) {
  toReQL(db) {
    const basicType = {
      name: this.name,
      isNode: true,
      fields: [
        {
          name: 'id',
          type: 'string',
        },
      ],
      parameters: [],
    };

    return RethinkDB.do(db.tableCreate(this.name), (result) => {
      return RethinkDB.do(db.table(TYPE_TABLE).insert(basicType), () => {
        return RethinkDB.expr({}).merge({
          success: result('tables_created').ne(0),
        });
      });
    });
  }
}
