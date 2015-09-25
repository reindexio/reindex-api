import { Map } from 'immutable';
import createNode from '../query/createNode';
import createViewer from '../query/createViewer';

const CommonQueryFields = Map({
  node: createNode,
  viewer: createViewer,
});

export default CommonQueryFields;
