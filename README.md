# reindex-api

[![Circle CI](https://circleci.com/gh/reindexio/reindex-api.svg?style=svg&circle-token=080d24db0ad712462742bb77cd91a316c2267e46)](https://circleci.com/gh/reindexio/reindex-api)

### Installation

- Install RethinkDB
- Install dependencies

  ```
  npm install
  ```
- Run tests

  ```
  npm test
  ```
- Create a test app

  ```
  npm run create-app localhost
  ```
- Run server

  ```
  npm start
  ```

### Dependencies

The package versions are pinned using `npm shrinkwrap`.

#### Adding a dependency

```
npm install <name> --save
npm shrinkwrap --dev
```

Remember to always commit the changes to the `npm-shrinkwrap.json` file after
modifying dependencies.
