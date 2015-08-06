import {Map} from 'immutable';
import createNode from '../query/createNode';

const CommonQueryFields = Map({
  node: createNode,
});

export default CommonQueryFields;
