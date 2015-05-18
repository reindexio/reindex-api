import {Map, Record} from 'immutable';
import OrderByConverter from './converters/OrderByConverter';
import SliceConverter from './converters/SliceConverter';

class Method extends Record({
  type: undefined,
  parameters: Map(),
  fn: undefined,
}) {
  toJS() {
    return {
      type: this.type,
      parameters: this.parameters.toJS(),
    };
  }
}

class MethodParameter extends Record({
  name: undefined,
  type: undefined,
}) {}

const connectionMethod = new Method({
  type: 'connection',
  parameters: Map({
    first: new MethodParameter({
      name: 'first',
      type: 'integer',
    }),
    after: new MethodParameter({
      name: 'after',
      type: 'integer',
    }),
    orderBy: new MethodParameter({
      name: 'orderBy',
      type: 'string',
    }),
  }),

  fn(query, {first, after, orderBy}) {
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
