import { Map } from 'immutable';
import createNode from '../query/createNode';
import createList from '../query/createList';
import createViewer from '../query/createViewer';

const CommonQueryFields = Map({
  node: createNode,
  list: createList,
  viewer: createViewer,
});

export default CommonQueryFields;
