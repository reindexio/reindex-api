import {List} from 'immutable';
import createCreate from '../mutations/createCreate';
import createUpdate from '../mutations/createUpdate';
import createReplace from '../mutations/createReplace';
import createDelete from '../mutations/createDelete';

const TypeMutationFieldCreators = List([
  createCreate,
  createUpdate,
  createReplace,
  createDelete,
]);

export default TypeMutationFieldCreators;
