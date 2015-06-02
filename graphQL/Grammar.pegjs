{
  var Map = require('immutable').Map;
  var List = require('immutable').List;
  var AST = require('./AST');
}

start
  = ws* call:call_property
    {
      return new AST.GQLRoot({
        name: call.name,
        alias: call.alias,
        parameters: call.parameters || Map(),
        children: call.children || List()
      });
    }

call_parameters
  = ws* '(' ws* call_parameters:parameter_list? ')'
    {
      return call_parameters;
    }

parameter_list
  = parameter_list:(
      first:parameter
      rest:(ws* property_separator ws* p:parameter { return p })*
      ws*
      { return first.merge.apply(first, rest); }
    )
    {
      return parameter_list;
    }

parameter
  = name:identifier ws* ':' ws* parameter:literal
    {
      return Map().set(name, parameter);
    }

block
  = ws* '{' ws* children:children? ws* '}' ws*
    {
      return children || [];
    }

children
  = children:(
      first:property
      rest:(property_separator ws* p:property { return p })*
      {
        return [first].concat(rest);
      }
    ) property_separator?
    {
      return children;
    }

property
  = call_property
  / object_property
  / simple_property

simple_property
  = name:identifier alias:alias? ws*
    {
      return new AST.GQLLeaf({
        name: name,
        alias: alias === null ? undefined : alias,
      });
    }

simple_call_property
  = name:identifier parameters:call_parameters alias:alias? ws*
    {
      return new AST.GQLLeaf({
        name: name,
        alias: alias === null ? undefined : alias,
        parameters: parameters,
      })
    }

object_property
  = name:identifier alias:alias? children:block
    {
      return new AST.GQLNode({
        name: name,
        alias: alias === null ? undefined : alias,
        children: List(children),
      });
    }

call_property
  = name:identifier parameters:call_parameters alias:alias? children:block
    {
      return new AST.GQLNode({
        name: name,
        alias: alias === null ? undefined : alias,
        parameters: parameters,
        children: List(children),
      });
    }

alias
 = ws+ 'as' ws+ alias:identifier ws*
   {
     return alias;
   }

property_separator
  = ','

identifier
  = prefix:[a-zA-Z_\$] suffix:[a-zA-z0-9_]*
    {
      return prefix + suffix.join('');
    }

ws 'whitespace'
  = [ \t\n\r]

literal
  = literal:([^\{\}\\\(\)\[\]\,] / escape)+
  {
    return literal.join('');
  }

escape
  = '\\' escape:.
  {
    return escape;
  }
