{
  var List = require('immutable').List;
  var AST = require('./AST');
}

start
  = ws? call:call calls:(calls?) children:block
    {
      return new AST.GQLRoot({
        name: call.name,
        calls: calls || List(),
        parameters: call.parameters || List(),
        children: List(children)
      });
    }

calls
  = calls:("." call:call { return call })+
    {
      if (Array.isArray(calls)) {
        return List(calls);
      } else {
        return List.of(calls);
      }
    }

call
  = name:call_name parameters:call_parameters
    {
      return new AST.GQLMethod({
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
      return List(parameter_list);
    }

parameter
  = parameter:[a-zA-Z0-9_=-]+
    {
      return parameter.join('');
    }

block
  = ws? '{' ws? children:children? ws? '}' ws?
    {
      return children || [];
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
      return new AST.GQLLeaf({
        name: name
      });
    }

object_property
  = name:identifier children:block
    {
      return new AST.GQLNode({
        name: name,
        children: List(children)
      });
    }

call_property
  = name:identifier calls:calls children:block?
    {
      return new AST.GQLNode({
        name: name,
        calls: List(calls),
        children: List(children)
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
