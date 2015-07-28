import {Record, Map, List} from 'immutable';

const SchemaSetup = Record({
  commonTypes: Map(),
  commonQueryFields: Map(),
  commonMutationFields: Map(),
  typeQueryFieldCreators: List(),
  typeMutationFieldCreators: List(),
});

export default SchemaSetup;
