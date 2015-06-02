import {Record, List, Stack} from 'immutable';
import TArray from '../../graphQL/typed/TArray';
import processParameters from '../processParameters';

export default class SchemaArrayField extends Record({
  name: undefined,
  type: undefined,
}) {
  convertNode(schema, node, parents, actualTypes = Stack()) {
    return new TArray({
      name: node.name,
      alias: node.alias,
      call: processParameters(schema, 'connection', node.parameters),
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('connection'),
          actualTypes.unshift(this.type),
        );
      }),
    });
  }
}
