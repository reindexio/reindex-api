import {Record, List, Stack} from 'immutable';
import TConnection from '../../graphQL/typed/TConnection';
import processParameters from '../processParameters';

export default class SchemaObjectsField extends Record({
  name: undefined,
}) {
  convertNode(schema, node, parents, actualTypes = Stack()) {
    return new TConnection({
      name: node.name,
      alias: node.alias,
      call: processParameters(schema, 'connection', node.parameters),
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('connection'),
          actualTypes,
        );
      }),
    });
  }
}
