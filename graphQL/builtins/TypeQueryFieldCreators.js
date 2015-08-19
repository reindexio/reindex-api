import { List } from 'immutable';
import createGet from '../query/createGet';
import createSearchFor from '../query/createSearchFor';

const TypeQueryFieldCreators = List([
  createGet,
  createSearchFor,
]);

export default TypeQueryFieldCreators;
