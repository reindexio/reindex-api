import {Record, List} from 'immutable';
import TNodes from '../../graphQL/typed/TNodes';

export default class SchemaNodesField extends Record({
  name: undefined,
}) {
  convertNode(schema, node, parents, actualType) {
    return new TNodes({
      name: node.alias || node.name,
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of(actualType.last()),
          actualType.pop()
        );
      }),
    });
  }
}
