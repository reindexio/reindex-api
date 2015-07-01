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
      indexes: [
        {
          name: 'id',
          fields: [
            {
              name: 'id',
            },
          ],
        },
      ],
    };

    return RethinkDB.do(db.tableCreate(this.name), () => {
      return RethinkDB.do(db.table(TYPE_TABLE).insert(basicType, {
        returnChanges: true,
      }), (result) => {
        return result('changes')(0)('new_val');
      });
    });
  }
}
