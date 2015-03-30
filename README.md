# graphql-api

```js
require('babel/register');
var orient = require('./orient');
var db = orient.getDb();
orient.getSchema(db).then(function (s) { console.log(JSON.stringify(s, null, 2)); });
```

```js
require('babel/register');
var orient = require('./orient');
var parser = require('./parser');
var query = require('./query');

var graphquery = parser.parse('Micropost(IzEwOjA=) { author { handle }, text, created_at }');

var db = orient.getDb();
orient.getSchema(db).then(function (s) {
    console.log(query.processQuery(s, graphquery));
});
```
