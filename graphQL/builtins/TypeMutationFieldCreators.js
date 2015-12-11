import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import createDelete from '../mutations/createDelete';

const TypeMutationFieldCreators = [
  createCreate,
  createUpdate,
  createReplace,
  createDelete,
];

export default TypeMutationFieldCreators;
