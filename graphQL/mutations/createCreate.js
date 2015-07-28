import createCRU from './createCRU';

export default function createCreate(type) {
  return createCRU('create', false, type);
}
