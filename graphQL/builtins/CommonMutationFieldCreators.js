import { Map } from 'immutable';
import createCreateReindexSecret
  from '../mutations/createCreateReindexSecret';
import createMigrate
  from '../mutations/createMigrate';

const CommonMutationFields = Map({
  createReindexSecret: createCreateReindexSecret,
  migrate: createMigrate,
});

export default CommonMutationFields;
