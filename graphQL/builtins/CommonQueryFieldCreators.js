import { Map } from 'immutable';
import createNode from '../query/createNode';
import createViewerField from '../query/createViewerField';

const CommonQueryFields = Map({
  node: createNode,
  viewer: createViewerField,
});

export default CommonQueryFields;
