/**
 * GraphQL AST data structures.
 */

import Immutable from 'immutable';

/**
 * Root of the GraphQL query
 */
export class GQLRoot extends Immutable.Record({
  node: undefined,
}) {}

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
export class GQLNode extends Immutable.Record({
  name: '',
  calls: Immutable.List(),
  children: Immutable.List(),
}) {
  isLeaf() {
    return false;
  }

  isNode() {
    return true;
  }
}

/**
 * @implements GLQTree
 */
export class GQLLeaf extends Immutable.Record({
  name: '',
}) {
  isLeaf() {
    return true;
  }

  isNode() {
    return false;
  }
}

/**
 * Method call in GraphQL
 */
export class GQLCall extends Immutable.Record({
  name: '',
  parameters: Immutable.List(),
}) {}
