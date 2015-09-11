export function type(name, props) {
  return { kind: 'OBJECT', fields: [], interfaces: [], name, ...props };
}

export function field(name, props) {
  return { type: 'Int', name, ...props };
}
