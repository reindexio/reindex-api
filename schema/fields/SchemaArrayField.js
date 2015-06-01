import {Record, List} from 'immutable';
import TArray from '../../graphQL/typed/TArray';
import processParameters from '../processParameters';

export default class SchemaArrayField extends Record({
  name: undefined,
  type: undefined,
}) {
  convertNode(schema, node, parents, actualType) {
    return new TArray({
      name: node.name,
      alias: node.alias,
      call: processParameters(schema, 'connection', node.parameters),
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('connection'),
          actualType.push(this.type),
        );
      }),
    });
  }
}
