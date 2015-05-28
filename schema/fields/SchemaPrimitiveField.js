import {Record} from 'immutable';
import TField from '../../graphQL/typed/TField';

export default class SchemaPrimitiveField extends Record({
  name: undefined,
  type: undefined,
}) {
  convertLeaf(schema, leaf) {
    return new TField({
      name: leaf.name,
      alias: leaf.alias,
    });
  }
}
