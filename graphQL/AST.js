/**
 * GraphQL AST data structures.
 */

import {
  List,
  Record,
} from 'immutable';
import * as Methods from '../query/methods';
import {
  TField,
  TObject,
  TConnectionRoot,
  TConnection,
  TReverseConnection,
  TArray,
  TMethod,
} from './Typed';

/**
 * Root of the GraphQL query
 */
export class GQLRoot extends Record({
  name: '',
  parameters: List(),
  methods: List(),
  children: List(),
}) {
  toTyped(schema, typeName, rootCall) {
    let rootCallReturnName = rootCall.returns;
    let [methods, returnType] = methodsToTyped(
      schema,
      rootCallReturnName,
      this.methods
    );

    if (returnType === 'connection') {
      let {count, nodes} = extractConnectionFields(this);

      let nodesObject;
      if (nodes) {
        nodesObject = new TObject({
          name: null,
          children: nodes.children.map((child) => {
            return child.toTyped(schema, List.of(typeName));
          }),
        });
      }

      return new TConnectionRoot({
        methods: methods,
        count: count !== undefined,
        nodes: nodesObject,
      });
    } else {
      let type = returnType;
      if (type === 'object') {
        type = typeName;
      }
      return new TObject({
        name: null,
        methods: methods,
        children: this.children.map((child) => {
          return child.toTyped(schema, List.of(type), typeName);
        }),
      });
    }
  }
}

/**
 * One node in GraphQL AST.
 *
 * @interface
 interface GQLTree {
   isLeaf(): boolean;
   isNode(): boolean;
 }
 *
 **/

/**
 * @implements GLQTree
 */
export class GQLNode extends Record({
  name: '',
  methods: List(),
  children: List(),
}) {
  toTyped(schema, parents, dependantType) {
    let type = getNestedSchema(schema, ...parents.push(this.name));
    if (dependantType && type.type === 'object') {
      return new TObject({
        name: this.name,
        children: this.children.map((child) => {
          return child.toTyped(schema, List.of(dependantType));
        }),
      });
    }
    if (type && type.isNestable()) {
      let [methods, ] = methodsToTyped(
        schema,
        type.name,
        this.methods
      );

      if (type.isConnection() && type.isEdgeable()) {
        let {count, nodes} = extractConnectionFields(this);
        return new TReverseConnection({
          name: this.name,
          methods: methods,
          target: type.target,
          reverseName: type.reverseName,
          count: count !== undefined,
          nodes: new TObject({
            name: null,
            children: nodes.children.map((child) => {
              return child.toTyped(schema, List.of(type.target));
            }),
          }),
        });
      } else if (type.isConnection()) {
        return new TConnection({
          name: this.name,
          methods: methods,
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
          methods: methods,
          count: count !== undefined,
          nodes: new TObject({
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
          methods: methods,
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
  name: '',
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

/**
 * Method call in GraphQL
 */
export class GQLMethod extends Record({
  name: '',
  parameters: List(),
}) {
  toTyped(schema, typeName) {
    let type = schema.types.get(typeName);
    let methodType = type.methods.get(this.name);
    if (methodType) {
      let returnType = methodType.returns;
      return [
        new TMethod({
          name: this.name,
          parameters: this.parameters,
          method: Methods[this.name],
        }),
        returnType,
      ];
    } else {
      throw new Error(
        'Method "' + this.name +
        '" is not valid for type "' +
        typeName + '".'
      );
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

function methodsToTyped(schema, typeName, methods) {
  return methods.reduce(([converted, nextType], method) => {
    let [typedMethod, returnType] = method.toTyped(schema, nextType);
    return [
      converted.push(typedMethod),
      returnType,
    ];
  }, [List(), typeName]);
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
