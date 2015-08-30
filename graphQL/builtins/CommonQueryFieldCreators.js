import { Map } from 'immutable';
import createNode from '../query/createNode';
import createSchemaField from '../query/createSchemaField';
import createViewer from '../query/createViewer';

const CommonQueryFields = Map({
  node: createNode,
  schema: createSchemaField,
  viewer: createViewer,
});

export default CommonQueryFields;
