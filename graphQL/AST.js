/**
 * GraphQL AST data structures.
 */

import {
  List,
  Record,
  Map,
} from 'immutable';
import {
  TField,
  TObject,
  TConnectionRoot,
  TConnection,
  TReverseConnection,
  TArray,
  TCall,
} from './Typed';
import rootCalls from '../query/rootCalls';
import methods from '../query/methods';

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
    let name = this.name;
    let rootCall = rootCalls.get(name);
    if (rootCall) {
      let parameters = rootCall.processParameters(schema, this.parameters);
      return {rootCall, parameters};
    } else {
      let validCalls = rootCalls
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
    let returnType = rootCall.returns;
    if (returnType === 'nodesResult') {
      let nodesResult = this.children.find((c) => c.name === 'objects');
      let rest = this.children.filterNot((c) => c.name === 'objects');
      if (rest.count() > 0) {
        let field = List.of('nodesResult').push(rest.first().name).join('.');
        throw new Error(
          `Nested field "${field}" does not exist. ` +
          `Valid nested fields are: objects.`
        );
      }
      return new TConnectionRoot({
        child: nodesResult.toTyped(schema, List.of(returnType), typeName),
      });
    } else {
      let type = returnType;
      if (type === 'object') {
        type = typeName;
      }
      return new TObject({
        name: null,
        children: this.children.map((child) => {
          return child.toTyped(schema, List.of(type), typeName);
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
  toTyped(schema, parents, dependantType) {
    let type = getNestedSchema(schema, ...parents.push(this.name));

    if (dependantType && type.type === 'object') {
      return new TObject({
        name: this.name,
        call: processParameters(schema, 'object', this.parameters),
        children: this.children.map((child) => {
          return child.toTyped(schema, List.of(dependantType));
        }),
      });
    } else if (dependantType && type.type === 'connection') {
      let {count, nodes} = extractConnectionFields(this);
      return new TArray({
        name: this.name,
        call: processParameters(schema, 'connection', this.parameters),
        count: count !== undefined,
        nodes: nodes && new TObject({
          name: null,
          children: nodes.children.map((child) => {
            return child.toTyped(
              schema,
              List.of(dependantType),
            );
          }),
        }),
      });
    } else if (type && type.isNestable()) {
      if (type.isConnection() && type.isEdgeable()) {
        let {count, nodes} = extractConnectionFields(this);
        return new TReverseConnection({
          name: this.name,
          call: processParameters(schema, 'connection', this.parameters),
          target: type.target,
          reverseName: type.reverseName,
          count: count !== undefined,
          nodes: nodes && new TObject({
            name: null,
            children: nodes.children.map((child) => {
              return child.toTyped(schema, List.of(type.target));
            }),
          }),
        });
      } else if (type.isConnection()) {
        return new TConnection({
          name: this.name,
          call: processParameters(schema, type.target, this.parameters),
          target: type.target,
          reverseName: type.reverseName,
          children: this.children.map((child) => {
            return child.toTyped(schema, List.of(type.target));
          }),
        });
      } else if (type.isEdgeable()) {
        let {count, nodes} = extractConnectionFields(this);
        return new TArray({
          name: this.name,
          call: processParameters(schema, 'connection', this.parameters),
          count: count !== undefined,
          nodes: nodes && new TObject({
            name: null,
            children: nodes.children.map((child) => {
              return child.toTyped(
                schema,
                parents.push(this.name),
                dependantType
              );
            }),
          }),
        });
      } else {
        return new TObject({
          name: this.name,
          call: processParameters(schema, this.name, this.parameters),
          children: this.children.map((child) => {
            return child.toTyped(
              schema,
              parents.push(this.name),
              dependantType
            );
          }),
        });
      }
    } else {
      let field = parents.push(this.name).join('.');
      let validFields = getNestedSchema(schema, ...parents)
        .fields
        .valueSeq()
        .filter((f) => {
          return f.isNestable();
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
}) {
  toTyped(schema, parents) {
    let type = getNestedSchema(schema, ...parents.push(this.name));
    if (type && !type.isNestable()) {
      return new TField({
        name: this.name,
      });
    } else {
      let field = parents.push(this.name).join('.');
      let validFields = getNestedSchema(schema, ...parents)
        .fields
        .valueSeq()
        .filter((f) => {
          return !f.isNestable();
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
  let type = schema.types.get(typeName);
  if (type) {
    return fields.reduce((currentType, next) => {
      if (currentType && currentType.fields) {
        return currentType.fields.get(next);
      }
    }, type);
  }
}

function extractConnectionFields(node) {
  let count = node.children.find((child) => child.name === 'count');
  let nodes = node.children.find((child) => child.name === 'nodes');
  let rest = node.children.filter((child) => {
    return (
      child.name !== 'count' &&
      child.name !== 'nodes'
    );
  });
  if (rest.count() === 0) {
    return {
      count: count,
      nodes: nodes,
    };
  } else {
    let field = rest.first().name;
    throw new Error(
      `"${field}" is an invalid field for a connection. ` +
      `Valid fields are nodes, count.`
    );
  }
}

function processParameters(schema, type, parameters) {
  let method = methods.get(type);
  if (!method && parameters.count() === 0) {
    return undefined;
  } else if (!method) {
    throw new Error(
      `"${type}" has no valid parameters, but was passed some.`
    );
  } else {
    return new TCall({
      call: method.call,
      parameters: method.processParameters(schema, parameters),
    });
  }
}
