import {Map} from 'immutable';
import {Call, Parameter} from './calls';
import OrderByConverter from './converters/OrderByConverter';
import SliceConverter from './converters/SliceConverter';

const connectionMethod = new Call({
  type: 'connection',
  parameters: Map({
    first: new Parameter({
      name: 'first',
      type: 'integer',
      isRequired: false,
    }),
    after: new Parameter({
      name: 'after',
      type: 'integer',
      isRequired: false,
    }),
    orderBy: new Parameter({
      name: 'orderBy',
      type: 'string',
      isRequired: false,
    }),
  }),

  call(query, {first, after, orderBy}) {
    if (orderBy) {
      query = query.updateIn(['converters'], (c) => {
        return c.push(new OrderByConverter({
          orderBy: orderBy,
        }));
      });
    }

    if (first || after) {
      query = query.updateIn(['converters'], (c) => {
        let from = after || 0;
        let to;
        if (first) {
          to = from + first;
        }
        return c.push(new SliceConverter({
          from, to,
        }));
      });
    }

    return query;
  },
});

const methods = Map({
  connection: connectionMethod,
});

export default methods;
