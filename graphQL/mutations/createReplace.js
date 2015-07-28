import createCRU from './createCRU';

export default function createReplace(type) {
  return createCRU('replace', true, type);
}
