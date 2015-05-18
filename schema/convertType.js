import {fromJS, Map, List} from 'immutable';

const TYPE_CONVERTERS = {
  number: parseFloat,
  integer(string) {
    if(/^(\-|\+)?([0-9]+)$/.test(string)) {
      return Number(string);
    } else {
      return NaN;
    }
  },
  string(string) {
    return string;
  },
  datetime(string) {
    return new Date(string);
  },
  boolean(string) {
    if (string === 'true') {
      return true;
    } else if (string === 'false') {
      return false;
    } else {
      throw new Error();
    }
  },
  object(string) {
    let result = fromJS(JSON.parse(string));
    if (Map.isMap(result)) {
      return result;
    } else {
      throw new Error();
    }
  },
  array(string) {
    let result = fromJS(JSON.parse(string));
    if (List.isList(result)) {
      return result;
    } else {
      throw new Error();
    }
  },
};

export default function convertType(type, object) {
  try {
    let result = TYPE_CONVERTERS[type](object);
    if ((type === 'number' || type === 'datetime' || type === 'integer')
        && isNaN(result)) {
      throw new Error();
    }
    return result;
  } catch(e) {
    throw new Error(
      `Can not convert "${object}" to ${type}.`
    );
  }
}
