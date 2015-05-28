import {Record, List} from 'immutable';
import TConnection from '../../graphQL/typed/TConnection';
import processParameters from '../processParameters';

export default class SchemaConnectionField extends Record({
  name: undefined,
  reverseName: undefined,
  type: undefined,
}) {
  convertNode(schema, node, parents, actualType) {
    return new TConnection({
      name: node.name,
      alias: node.alias,
      type: this.type,
      reverseName: this.reverseName,
      call: processParameters(schema, 'connection', node.parameters),
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of('connection'),
          List.of(this.type) || actualType
        );
      }),
    });
  }
}
