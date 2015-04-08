import Immutable from 'immutable';

export class GQLRoot extends Immutable.Record({
  node: undefined
}) {}

export class GQLNode extends Immutable.Record({
  name: '',
  calls: Immutable.List(),
  children: Immutable.List()
}) {
  isLeaf() {
    return false;
  }

  isNode() {
    return true;
  }
}

export class GQLCall extends Immutable.Record({
  name: '',
  parameters: Immutable.List()
  //kwParameters: Immutable.Map()
}) {}

export class GQLLeaf extends Immutable.Record({
  name: ''
}) {
  isLeaf() {
    return true;
  }

  isNode() {
    return false;
  }
}
