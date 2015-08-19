import { Map } from 'immutable';
import createNode from '../query/createNode';
import createSchemaField from '../query/createSchemaField';

const CommonQueryFields = Map({
  node: createNode,
  schema: createSchemaField,
});

export default CommonQueryFields;
