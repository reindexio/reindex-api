import {Map} from 'immutable';
import createCreateReindexSecret
  from '../mutations/createCreateReindexSecret';

const CommonMutationFields = Map({
  createReindexSecret: createCreateReindexSecret,
});

export default CommonMutationFields;
