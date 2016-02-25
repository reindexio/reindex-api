import createCreateReindexSecret from '../mutations/createCreateReindexSecret';
import createLoginWithToken from '../mutations/createLoginWithToken';
import createMigrate from '../mutations/createMigrate';

const CommonMutationFields = {
  createReindexSecret: createCreateReindexSecret,
  loginWithToken: createLoginWithToken,
  migrate: createMigrate,
};

export default CommonMutationFields;
