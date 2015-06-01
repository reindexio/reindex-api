import {Record} from 'immutable';
import SliceConverter from '../../query/converters/SliceConverter';
import CountConverter from '../../query/converters/CountConverter';
import mapAndPluck from '../mapAndPluck';

export default class TCount extends Record({
  name: undefined,
}) {
  toQuery(query, parents, newQuery) {
    return mapAndPluck(
      query,
      [...parents, this.name],
      newQuery.updateIn(['converters'], (converters) => {
        return converters
          .filter((converter) => {
            return !(converter instanceof SliceConverter);
          })
          .push(new CountConverter({}));
      })
    );
  }
}
