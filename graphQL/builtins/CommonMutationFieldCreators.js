import { Map } from 'immutable';
import createCreateReindexSecret
  from '../mutations/createCreateReindexSecret';
import createCreateReindexType from '../mutations/createCreateReindexType';
import createDeleteReindexType from '../mutations/createDeleteReindexType';

const CommonMutationFields = Map({
  createReindexSecret: createCreateReindexSecret,
  createReindexType: createCreateReindexType,
  deleteReindexType: createDeleteReindexType,
});

export default CommonMutationFields;
