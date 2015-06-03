import {Record} from 'immutable';
import TCursor from '../../graphQL/typed/TCursor';

export default class SchemaCursorField extends Record({
  name: undefined,
}) {
  convertLeaf(schema, leaf) {
    return new TCursor({
      name: leaf.alias || leaf.name,
    });
  }
}
