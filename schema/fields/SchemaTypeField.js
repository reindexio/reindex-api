import {Record, List} from 'immutable';
import TType from '../../graphQL/typed/TType';

export default class SchemaTypeField extends Record({
  name: undefined,
  type: undefined,
}) {
  convertNode(schema, node) {
    return new TType({
      name: node.name,
      alias: node.alias,
      type: this.type,
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('type')
        );
      }),
    });
  }
}
