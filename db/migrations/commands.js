export class CreateType {
  commandType = 'CreateType';
  isDestructive = false;

  constructor(type) {
    this.type = type;
  }

  description() {
    return `create new type ${this.type.name}`;
  }

  getData() {
    return {
      ...this.type,
    };
  }
}

export class CreateTypeData {
  commandType = 'CreateTypeData'
  isDestructive = false;

  constructor(type) {
    this.type = type;
  }

  description() {
    return `create storage for type ${this.type.name}`;
  }
}

export class DeleteType {
  commandType = 'DeleteType';
  isDestructive = false;

  constructor(type) {
    this.type = type;
  }

  description() {
    return `delete type ${this.type.name}`;
  }
}

export class DeleteTypeData {
  commandType = 'DeleteTypeData';
  isDestructive = true;

  constructor(type) {
    this.type = type;
  }

  description() {
    return `delete all data of type ${this.type.name}`;
  }
}

export class CreateField {
  commandType = 'CreateField';
  isDestructive = false;

  constructor(type, fieldName, fieldType, options = {}) {
    this.type = type;
    this.fieldName = fieldName;
    this.fieldType = fieldType;
    this.options = options;
  }

  description() {
    return (
      `add new field ${this.fieldName} (${this.fieldType}) ` +
      `to type ${this.type.name}`
    );
  }

  getData() {
    return {
      ...this.options,
      name: this.fieldName,
      type: this.fieldType,
    };
  }
}

export class DeleteField {
  commandType = 'DeleteField';
  isDestructive = false;

  constructor(type, fieldName) {
    this.type = type;
    this.fieldName = fieldName;
  }

  description() {
    return `remove field ${this.fieldName} from type ${this.type.name}`;
  }
}

export class DeleteFieldData {
  commandType = 'DeleteFieldData';
  isDestructive = true;

  constructor(type, path) {
    this.type = type;
    this.path = path;
  }

  description() {
    return (
      `remove field data at ${this.path.join('.')} from type ${this.type.name}`
    );
  }
}

export class UpdateFieldInfo {
  commandType = 'UpdateFieldInfo';
  isDestructive = false;

  constructor(type, fieldName, options) {
    this.type = type;
    this.fieldName = fieldName;
    this.options = options;
  }

  description() {
    return (
      `update metadata of field ${this.fieldName} of type ${this.type.name}`
    );
  }

  getData() {
    return {
      ...this.options,
    };
  }
}
