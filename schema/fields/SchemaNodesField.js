import {Record, List, Stack} from 'immutable';
import TNodes from '../../graphQL/typed/TNodes';

export default class SchemaNodesField extends Record({
  name: undefined,
}) {
  convertNode(schema, node, parents, actualTypes = Stack()) {
    return new TNodes({
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
