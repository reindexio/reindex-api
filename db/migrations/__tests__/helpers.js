export function type(name, props = {}) {
  if (props.interfaces && props.interfaces.includes('Node')) {
    props.fields = props.fields || [];
    props.fields.unshift({
      type: 'ID',
      name: 'id',
      nonNull: true,
    });
  }
  return { kind: 'OBJECT', fields: [], interfaces: [], name, ...props };
}

export function field(name, props) {
  return { type: 'Int', name, ...props };
}
