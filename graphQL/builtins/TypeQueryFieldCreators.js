import { List } from 'immutable';
import createGet from '../query/createGet';
import createGetByField from '../query/createGetByField';

const TypeQueryFieldCreators = List([
  createGet,
  createGetByField,
]);

export default TypeQueryFieldCreators;
