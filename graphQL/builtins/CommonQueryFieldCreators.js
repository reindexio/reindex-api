import createNode from '../query/createNode';
import createViewerField from '../query/createViewerField';

const CommonQueryFields = {
  node: createNode,
  viewer: createViewerField,
};

export default CommonQueryFields;
