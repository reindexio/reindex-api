import createCRU from './createCRU';

export default function createCreate(type, interfaces, typeSets) {
  return createCRU('create', false, type, interfaces, typeSets);
}
