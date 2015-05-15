import {List, Map, fromJS, Record} from 'immutable';
import protoDefs from 'rethinkdb/proto-def';

const CODE_TO_TERM = Map(
  protoDefs.Term.TermType
).flip().merge(
  Map(
    protoDefs.Datum.DatumType
  ).flip()
);

class QueryTerm extends Record({
  op: '',
  args: List(),
  optArgs: Map(),
}) {}

/**
 * Deconstruct ReQL query to List of terms.
 */
export function getTerms(rQuery) {
  return parseQueryString(fromJS(rQuery.build()));
}

/**
 * Get nested query argument at position.
 */
export function getNestedQueryArgument(parsedQuery, position) {
  return parsedQuery.get(position).args.first().args;
}

function parseQueryString(rQuery) {
  let [op, allArgs, optArgs] = rQuery;
  let [child, args] = splitArgsOps(allArgs);
  return List.of(new QueryTerm({
    op: CODE_TO_TERM.get(op),
    args: args.flatMap(parseArg),
    optArgs: optArgs ? optArgs : Map(),
  })).concat(
    child ? parseQueryString(child) : []
  );
}

function splitArgsOps(list) {
  if (list.count() > 1) {
    return [
      list.first(),
      list.rest(),
    ];
  } else {
    return [
      undefined,
      list,
    ];
  }
}

function parseArg(arg) {
  if (List.isList(arg)) {
    return parseQueryString(arg);
  } else {
    return List.of(arg);
  }
}
