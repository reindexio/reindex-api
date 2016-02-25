# reindex-api

[![Circle CI](https://circleci.com/gh/reindexio/reindex-api.svg?style=svg&circle-token=080d24db0ad712462742bb77cd91a316c2267e46)](https://circleci.com/gh/reindexio/reindex-api)

reindex-api is a multi-tenant, hosted GraphQL database solution. reindex-api converts a JSON based schema into a GraphQL API in addition to creating a database storage (MongoDB or RethinkDB) underneath. GraphQL API is fully Relay compatible and contains CRUD operations as entry points. Input is Relay-aware and declarative. Additionally, reindex-api provides Social Login with 5 providers (Auth0, Facebook, Google, Twitter and Github). Functionality of reindex-api can be extended by configuring hooks that call external web services. It also provides a rich permission system based on defining graph paths to the user type.

reindex-api was designed with scalability in mind, but so far doesn't have many possible performance improving tools, like e.g. cache or query optimizations.

### Components

* schema creator - gets list of types and creates db independent GraphQL API
* database connector - abstracts out RethinkDB and MongoDB specifics
* database migration tool - abstracts out changes to the database after schema
  is updated
* permission checker - checks permissions based on graph path traversal
* multi-tenancy module - gets the api of correct user and manages apps
* social login - manages third-party auth service integration
* http server - manages request and JWT request authentication

### Installation

- Install MongoDB and optionally RethinkDB
- Install dependencies

  ```
  npm install
  ```

- Run tests

  ```
  npm test
  ```

- Create admin app

  ```
  npm run create-admin-app admin.localhost.reindexio.com
  ```

- Create a test app (`localhost`)

  ```
  npm run create-app
  ```

- Run server

  ```
  npm start
  ```

- You can login into GraphiQL by passing the admin token in the `token` query
string argument:

  ```
  http://localhost:5000/?token=<YOUR_TOKEN>
  ```
