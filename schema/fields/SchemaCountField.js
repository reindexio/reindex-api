import {Record} from 'immutable';
import TCount from '../../graphQL/typed/TCount';

export default class SchemaCountField extends Record({
  name: undefined,
}) {
  convertLeaf(schema, leaf) {
    return new TCount({
      name: leaf.alias || leaf.name,
    });
  }
}
