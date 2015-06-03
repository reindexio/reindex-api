import {Record, List, Stack} from 'immutable';
import TEdgesNode from '../../graphQL/typed/TEdgesNode';

export default class SchemaEdgesNodeField extends Record({
  name: undefined,
}) {
  convertNode(schema, node, parents, actualTypes = Stack()) {
    return new TEdgesNode({
      name: node.alias || node.name,
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of(actualTypes.first()),
          actualTypes.shift()
        );
      }),
    });
  }
}
