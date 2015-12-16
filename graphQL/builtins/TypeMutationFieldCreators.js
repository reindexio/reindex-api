import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import createDelete from '../mutations/createDelete';
import createConnectionMutations from '../mutations/createConnectionMutations';

const TypeMutationFieldCreators = [
  createCreate,
  createUpdate,
  createReplace,
  createDelete,
  createConnectionMutations,
];

export default TypeMutationFieldCreators;
