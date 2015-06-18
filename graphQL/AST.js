/**
 * GraphQL AST data structures.
 */

import {
  List,
  Record,
  Map,
  Stack,
} from 'immutable';
import TConnectionRoot from './typed/TConnectionRoot';
import TObjectRoot from './typed/TObjectRoot';
import rootCalls from '../query/rootCalls';


/**
 * Root of the GraphQL query
 */
export class GQLRoot extends Record({
  name: undefined,
  alias: undefined,
  parameters: Map(),
  children: List(),
}) {
  getRootCall(schema) {
    const name = this.name;
    const rootCall = rootCalls.get(name);
    if (rootCall) {
      const parameters = rootCall.processParameters(schema, this.parameters);
      return {rootCall, parameters};
    } else {
      const validCalls = rootCalls
        .valueSeq()
        .map((rc) => {
          return rc.name;
        })
        .join(', ');
      throw new Error(
        `Root call "${name}" is invalid. ` +
        `Valid root calls are ${validCalls}.`
      );
    }
  }

  toTyped(schema, typeName, rootCall) {
    const returnType = schema.types.get(rootCall.returns);
    if (rootCall.returns === 'object') {
      return new TObjectRoot({
        children: this.children.map((child) => {
          return child.toTyped(schema, List.of(typeName));
        }),
      });
    } else if (returnType.name === 'nodesResult') {
      return new TConnectionRoot({
        children: this.children.map((child) => {
          return child.toTyped(
            schema,
            List.of(returnType.name),
            Stack.of(typeName)
          );
        }),
      });
    } else {
      return new TObjectRoot({
        children: this.children.map((child) => {
          return child.toTyped(
            schema,
            List.of(returnType.name),
            Stack.of(typeName)
          );
        }),
      });
    }
  }
}

export class GQLNode extends Record({
  name: undefined,
  alias: undefined,
  parameters: Map(),
  children: List(),
}) {
  toTyped(schema, parents, actualTypes) {
    const type = getNestedSchema(schema, ...parents.push(this.name));
    if (type && type.convertNode) {
      return type.convertNode(schema, this, parents, actualTypes);
    } else {
      const field = parents.push(this.name).join('.');
      const validFields = getNestedSchema(schema, ...parents)
        .fields
        .valueSeq()
        .filter((f) => {
          return f.convertNode;
        })
        .map((f) => {
          return f.name;
        })
        .join(', ');
      if (type) {
        throw new Error(
          `"${field}" is scalar, but was passed fields. ` +
          `Valid nested fields are: ${validFields}`
        );
      } else {
        throw new Error(
          `Nested field "${field}" does not exist. ` +
          `Valid nested fields are: ${validFields}`
        );
      }
    }
  }
}

/**
 * @implements GLQTree
 */
export class GQLLeaf extends Record({
  name: undefined,
  alias: undefined,
  parameters: Map(),
}) {
  toTyped(schema, parents) {
    const type = getNestedSchema(schema, ...parents.push(this.name));
    if (type && type.convertLeaf) {
      return type.convertLeaf(schema, this, parents);
    } else {
      const field = parents.push(this.name).join('.');
      const validFields = getNestedSchema(schema, ...parents)
        .fields
        .valueSeq()
        .filter((f) => {
          return f.convertLeaf;
        })
        .map((f) => {
          return f.name;
        })
        .join(', ');

      if (type) {
        throw new Error(
          `"${field}" is nested, but was not passed fields. ` +
          `Valid scalar fields are: ${validFields}`
        );
      } else {
        throw new Error(
          `Scalar field "${field}" does not exist. ` +
          `Valid scalar fields are: ${validFields}`
        );
      }
    }
  }
}

function getNestedSchema(schema, typeName, ...fields) {
  const type = schema.types.get(typeName);
  if (type) {
    return fields.reduce((currentType, next) => {
      if (currentType && currentType.fields) {
        return currentType.fields.get(next);
      }
    }, type);
  }
}
