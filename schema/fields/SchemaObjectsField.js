import {Record, List} from 'immutable';
import TConnection from '../../graphQL/typed/TConnection';
import processParameters from '../processParameters';

export default class SchemaObjectsField extends Record({
  name: undefined,
}) {
  convertNode(schema, node, parents, actualType) {
    return new TConnection({
      name: node.name,
      alias: node.alias,
      call: processParameters(schema, 'connection', node.parameters),
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('connection'),
          actualType,
        );
      }),
    });
  }
}
