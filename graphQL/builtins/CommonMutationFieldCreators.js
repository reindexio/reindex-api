import createCreateReindexSecret from '../mutations/createCreateReindexSecret';
import createMigrate from '../mutations/createMigrate';

const CommonMutationFields = {
  createReindexSecret: createCreateReindexSecret,
  migrate: createMigrate,
};

export default CommonMutationFields;
