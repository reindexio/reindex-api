import {Record, List, Stack} from 'immutable';
import TEdges from '../../graphQL/typed/TNodes';

export default class SchemaEdgesField extends Record({
  name: undefined,
}) {
  convertNode(schema, node, parents, actualTypes = Stack()) {
    return new TEdges({
      name: node.alias || node.name,
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('edges'),
          actualTypes
        );
      }),
    });
  }
}
