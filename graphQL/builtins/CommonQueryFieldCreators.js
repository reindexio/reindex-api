import createNode from '../query/createNode';
import createViewerField from '../query/createViewerField';
import createError from '../query/createError';

const CommonQueryFields = {
  node: createNode,
  viewer: createViewerField,
};

if (process.env.NODE_ENV !== 'production') {
  CommonQueryFields.error = createError;
}

export default CommonQueryFields;
