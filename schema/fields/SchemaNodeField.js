import {Record, List} from 'immutable';
import TNode from '../../graphQL/typed/TNode';

export default class SchemaNodeField extends Record({
  name: undefined,
  reverseName: undefined,
  type: undefined,
}) {
  convertNode(schema, node) {
    return new TNode({
      name: node.name,
      alias: node.alias,
      type: this.type,
      children: node.children.map((child) => {
        return child.toTyped(
          schema,
          List.of(this.type)
        );
      }),
    });
  }
}
