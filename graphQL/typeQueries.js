import {List} from 'immutable';
import createGet from './query/createGet';
import createSearchFor from './query/createSearchFor';

const typeQueries = List([
  createGet,
  createSearchFor,
]);

export default typeQueries;
