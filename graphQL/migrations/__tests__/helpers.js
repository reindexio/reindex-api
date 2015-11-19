export function type(name, props = {}) {
  if (props.interfaces && props.interfaces.includes('Node')) {
    props.fields = props.fields || [];
    if (!props.fields.some((thefield) => thefield.name === 'id')) {
      props.fields.unshift({
        type: 'ID',
        name: 'id',
        nonNull: true,
        unique: true,
      });
    }
  }
  return { kind: 'OBJECT', fields: [], interfaces: [], name, ...props };
}

export function field(name, props) {
  return { type: 'Int', name, ...props };
}
