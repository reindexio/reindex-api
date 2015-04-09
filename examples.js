// {
//   "name": "user",
//   "calls": [
//     {
//       "parameters": [
//         "freiksenet"
//       ]
//     }
//   ],
//   "type": "call",
//   "properties": [
//     {
//       "name": "handle",
//       "type": "field"
//     },
//     {
//       "name": "microposts",
//       "properties": [
//         {
//           "name": "edges",
//           "properties": [
//             {
//               "name": "text",
//               "type": "field"
//             },
//             {
//               "name": "createdAt",
//               "type": "field"
//             }
//           ],
//           "type": "nested"
//         },
//         {
//           "name": "count",
//           "type": "field"
//         }
//       ],
//       "type": "nested"
//     }
//   ],
//   "root": true
// }

// {
//   "Micropost": {
//     "name": "Micropost",
//     "properties": {
//       "author": {
//         "name": "author",
//         "type": "LINK",
//         "linkedClass": "User"
//       },
//       "text": {
//         "name": "text",
//         "type": "STRING",
//         "linkedClass": null
//       },
//       "created_at": {
//         "name": "created_at",
//         "type": "DATETIME",
//         "linkedClass": null
//       }
//     }
//   },
//   "User": {
//     "name": "User",
//     "properties": {
//       "handle": {
//         "name": "handle",
//         "type": "STRING",
//         "linkedClass": null
//       },
//       "microposts": {
//         "name": "microposts",
//         "type": "LINKSET",
//         "linkedClass": "Micropost"
//       }
//     }
//   }
// }

/* eslint no-process-exit: [0], no-var: [0] */

require('babel/register');
var Immutable = require('immutable');
var r = require('rethinkdb');
var schema = require('./schema');
var parser = require('./parser');
var query = require('./query');

function makeRootCall(tableName) {
  return function tableRootCall() {
    return {
      preQueries: Immutable.List(),
      query: new query.Query({
        table: tableName
      }),
      rootName: tableName
    };
  };
}

function getById(q, node, call) {
  return q.set('selector', new query.IDSelector({
    ids: call.parameters
  }));
}

var testSchema = new schema.Schema({
  rootCalls: Immutable.Map({
    User: makeRootCall('User'),
    Micropost: makeRootCall('Micropost')
  }),
  calls: Immutable.Map({
    '__call__': getById
  }),
  tables: Immutable.Map({
    User: Immutable.Map({
      handle: new schema.SchemaPrimitiveField({
        name: 'handle',
        type: schema.SCHEMA_TYPES.string
      }),
      microposts: new schema.SchemaConnectionListField({
        name: 'microposts',
        reverseName: 'author',
        target: 'Micropost'
      })
    }),
    Micropost: Immutable.Map({
      text: new schema.SchemaPrimitiveField({
        name: 'text',
        type: schema.SCHEMA_TYPES.string
      }),
      createdAt: new schema.SchemaPrimitiveField({
        name: 'createdAt',
        type: schema.SCHEMA_TYPES.datetime
      }),
      author: new schema.SchemaConnectionField({
        name: 'author',
        reverseName: 'microposts',
        target: 'User'
      })
    })
  })
});

var db = r.db('test');

var q1 = 'Micropost(f2f7fb49-3581-4caa-b84b-e9489eb47d84) { text, createdAt, author { handle }}';
var gql1 = parser.parse(q1);
var q2 = 'User(bbd1db98-4ac4-40a7-b514-968059c3dbac) { handle, microposts { count, edges { text, createdAt }}}';
var gql2 = parser.parse(q2);

console.log(gql1);
var rql1 = query.constructQuery(testSchema, gql1);
console.log(rql1);
console.log(rql1.query.toRQL(r, db).toString());
console.log(gql2);
var rql2 = query.constructQuery(testSchema, gql2);
console.log(rql2);
console.log(rql2.query.toRQL(r, db).toString());

r.connect({}, function connectionCallback(err, conn) {
  if (err) {
    console.log(err);
  } else {
    var q = rql2.query.toRQL(r, db);
    q.run(conn).then(function resultCallback(result) {
      console.log(JSON.stringify(result, null, 2));
      process.exit();
    });
  }
});

// var Immutable = require('immutable');
// var x = Immutable.Map({x: Immutable.Map({y: 5}), z: 10});
// require('babel/register');
// var utils = require('./utils');
// utils.walkLeafs(x, function (l, k, ks) { console.log(l, k, ks); return l; });
