import {Record, List, Stack} from 'immutable';
import TObject from '../../graphQL/typed/TObject';

export default class SchemaObjectField extends Record({
  name: undefined,
  type: undefined,
}) {
  convertNode(schema, node, parents, actualTypes = Stack()) {
    return new TObject({
      name: node.name,
      alias: node.alias,
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of(this.type || actualTypes.first()),
          actualTypes.shift()
        );
      }),
    });
  }
}
