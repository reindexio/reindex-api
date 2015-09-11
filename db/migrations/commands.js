export class CreateType {
  constructor(name) {
    this.kind = 'CreateType';
    this.name = name;
  }
}

export class DeleteType {
  constructor(name) {
    this.kind = 'DeleteType';
    this.name = name;
  }
}

export class CreateField {
  constructor(typeName, name) {
    this.kind = 'CreateField';
    this.typeName = typeName;
    this.name = name;
  }
}

export class DeleteField {
  constructor(typeName, name) {
    this.kind = 'DeleteField';
    this.typeName = typeName;
    this.name = name;
  }
}

export class UpdateFieldInfo {
  constructor(typeName, name) {
    this.kind = 'UpdateFieldInfo';
    this.typeName = typeName;
    this.name = name;
  }
}
