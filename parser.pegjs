{
  var Immutable = require('immutable');
  var graphql = require('./graphql');
}

start
  = call:root_call children:block
    {
      return new graphql.GQLRoot({
        node: call.set("children", Immutable.List(children))
      });
    }

root_call
  = root_call_nested /
    root_call_direct

root_call_nested = ws? name:identifier calls:calls
  {
    return new graphql.GQLNode({
      name: name,
      calls: calls
    });
  }

root_call_direct = ws? call:call
  {
    return new graphql.GQLNode({
      name: call.name,
      calls: Immutable.List.of(
        new graphql.GQLCall({parameters: call.parameters})
      )
    });
  }

calls
  = calls:("." call:call { return call })+
    {
      if (Array.isArray(calls)) {
        return Immutable.List(calls);
      } else {
        return Immutable.List.of(calls);
      }
    }

call
  = name:call_name parameters:call_parameters
    {
      return new graphql.GQLCall({
        name: name,
        parameters: parameters
      });
    }

call_name
  = identifier

call_parameters
  = ws? '(' ws? call_parameters:parameter_list? ')'
    {
      return call_parameters;
    }

parameter_list
  = parameter_list:(
      first:parameter
      rest:(ws? property_separator ws? p:parameter { return p })*
      ws?
      { return [first].concat(rest); }
    )
    {
      return Immutable.List(parameter_list);
    }

parameter
  = parameter:[a-zA-Z0-9_=-]+
    {
      return parameter.join('');
    }

block
  = ws? '{' ws? children:children ws? '}' ws?
    {
      return children;
    }

children
  = children:(
      first:property
      rest:(property_separator ws? p:property { return p })*
      {
        return [first].concat(rest);
      }
    )
    {
      return children;
    }

property
  = call_property
  / object_property
  / simple_property

simple_property
  = name:identifier ws?
    {
      return new graphql.GQLLeaf({
        name: name
      });
    }

object_property
  = name:identifier children:block
    {
      return new graphql.GQLNode({
        name: name,
        children: Immutable.List(children)
      });
    }

call_property
  = name:identifier calls:calls children:block?
    {
      return new graphql.GQLNode({
        name: name,
        calls: Immutable.List(calls),
        children: Immutable.List(children)
      });
    }

property_separator
  = ','

identifier
  = prefix:[a-zA-Z\$] suffix:[a-zA-z0-9_]*
    {
      return prefix + suffix.join('');
    }

ws 'whitespace'
  = [ \t\n\r]*
