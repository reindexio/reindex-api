import {Record} from 'immutable';
import Query from '../../query/Query';
import FieldSelector from '../../query/selectors/FieldSelector';

export default class TField extends Record({
  name: undefined,
  alias: undefined,
  call: undefined,
}) {
  toQuery(query, parents) {
    if (this.call) {
      query = this.call.toQuery(query);
    }

    if (this.alias) {
      query = query.setIn(
        ['map', ...parents, this.alias],
        new Query({
          selector: new FieldSelector({
            path: [...parents, this.name],
          }),
        })
      );
    }

    return query.setIn(
      ['pluck', ...parents, this.alias || this.name],
      true
    );
  }
}
