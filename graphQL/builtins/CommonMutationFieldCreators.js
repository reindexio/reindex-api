import createCreateReindexSecret from '../mutations/createCreateReindexSecret';
import createLoginWithAccessToken
  from '../mutations/createLoginWithAccessToken';
import createMigrate from '../mutations/createMigrate';

const CommonMutationFields = {
  createReindexSecret: createCreateReindexSecret,
  loginWithAccessToken: createLoginWithAccessToken,
  migrate: createMigrate,
};

export default CommonMutationFields;
