import { values } from 'lodash';

export default class TypeRegistry {
  constructor() {
    this._typeSets = {};
    this._interfaces = {};
    this._viewer = null;
  }

  registerTypeSet(typeSet) {
    this._typeSets[typeSet.name] = typeSet;
  }

  registerTypeSets(typeSets) {
    for (const typeSet of typeSets) {
      this.registerTypeSet(typeSet);
    }
  }

  registerViewer(viewer) {
    this._viewer = viewer;
  }

  registerInterface(interfaceType) {
    this._interfaces[interfaceType.name] = interfaceType;
  }

  getInterface(name) {
    return this._interfaces[name];
  }

  getTypeSet(name) {
    return this._typeSets[name];
  }

  getTypeSets() {
    return values(this._typeSets);
  }

  getViewer() {
    return this._viewer;
  }
}
