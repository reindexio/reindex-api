import {Map} from 'immutable';
import genericQueries from './genericQueries';
import genericMutations from './genericMutations';
import typeQueries from './typeQueries';
import typeMutations from './typeMutations';

const defaultSetup = {
  builtIns: Map(),
  genericQueries,
  genericMutations,
  typeQueries,
  typeMutations,
};

export default defaultSetup;
