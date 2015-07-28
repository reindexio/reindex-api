import createCRU from './createCRU';

export default function createUpdate(type) {
  return createCRU('update', true, type);
}
