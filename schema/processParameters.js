import TCall from '../graphQL/typed/TCall';
import methods from '../query/methods';

export default function processParameters(schema, type, parameters) {
  const method = methods.get(type);
  if (!method && parameters.count() === 0) {
    return undefined;
  } else if (!method) {
    throw new Error(`"${type}" has no valid parameters, but was passed some.`);
  } else {
    return new TCall({
      call: method.call,
      parameters: method.processParameters(schema, parameters),
    });
  }
}
