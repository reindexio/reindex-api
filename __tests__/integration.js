import { get, values, sortBy, last } from 'lodash';
import uuid from 'uuid';

import deleteApp from '../apps/deleteApp';
import getDB from '../db/getDB';
import DatabaseTypes from '../db/DatabaseTypes';
import { fromReindexID, toReindexID } from '../graphQL/builtins/ReindexID';
import { toCursor } from '../graphQL/builtins/Cursor';
import {
  makeRunQuery,
  createTestApp,
  createFixture,
} from '../test/testAppUtils';
import assert from '../test/assert';

describe('Integration Tests', () => {
  const hostname = `test.${uuid.v4()}.example.com`;
  let db;
  let runQuery;

  const fixtures = {
    User: {},
    Micropost: {},
    ReindexAuthenticationProvider: {},
  };

  before(async function () {
    await createTestApp(hostname);
    db = await getDB(hostname);
    runQuery = makeRunQuery(db);

    const createdProvider = await createFixture(
      runQuery,
      'ReindexAuthenticationProvider',
      {
        type: 'github',
        clientId: 'fakeClientId',
        clientSecret: 'fakeClientSecret',
        isEnabled: true,
      },
      'id, type, clientId, clientSecret, isEnabled,'
    );

    fixtures.ReindexAuthenticationProvider[
      createdProvider.id
    ] = createdProvider;

    for (let i = 0; i < 2; i++) {
      const createdUser = await createFixture(runQuery, 'User', {
        handle: `user-${i}`,
      }, 'id, handle');

      fixtures.User[createdUser.id] = createdUser;
    }

    for (let i = 0; i < 20; i++) {
      const createdMicropost = await createFixture(runQuery, 'Micropost', {
        text: `micropost-${i}`,
        createdAt: '@TIMESTAMP',
        author: values(fixtures.User)[0].id,
        tags: [`tag-${i}`, `tag-${i + 1}`],
        mainCategory: {
          name: `category-${i}`,
        },
        categories: [
          {
            name: `category-${i}`,
          },
          {
            name: `category-${i + 1}`,
          },
        ],
      }, `
        id,
        text,
        createdAt,
        author {
          id
        },
        tags,
        categories {
          name
        },
        mainCategory {
          name
        },
      `);

      fixtures.Micropost[createdMicropost.id] = createdMicropost;
    }
  });

  after(async function () {
    await db.close();
    await deleteApp(hostname);
  });

  it('queries with node', async function() {
    const micropost = values(fixtures.Micropost)[0];
    const id = micropost.id;

    const result = await runQuery(`
      query nodetest($id: ID!) {
        node(id: $id) {
          id,
          ... on Micropost {
            text,
            createdAt,
            author {
              id
            }
            tags,
            categories {
              name
            },
            mainCategory {
              name
            },
          }
        }
      }
    `, {
      id,
    });

    assert.deepEqual(result, {
      data: {
        node: micropost,
      },
    });

    const authProvider = values(fixtures.ReindexAuthenticationProvider)[0];

    const builtinID = authProvider.id;

    const builtinResult = await runQuery(`
      query nodetest($id: ID!) {
        node(id: $id) {
          id
          ... on ReindexAuthenticationProvider {
            type,
            isEnabled,
            clientId,
            clientSecret,
          }
        }
      }
    `, {
      id: builtinID,
    });

    assert.deepEqual(builtinResult, {
      data: {
        node: authProvider,
      },
    });

    const bogusID = toReindexID({
      ...fromReindexID(micropost.id),
      type: 'Bogus',
    });
    const notFoundResult = await runQuery(
      'query ($id: ID!) { node(id: $id) { id } }',
      { id: bogusID },
    );
    assert.deepEqual(notFoundResult, { data: { node: null } });
  });

  it('queries by id', async function() {
    const micropost = values(fixtures.Micropost)[0];
    const micropostId = micropost.id;
    const micropostResult = await runQuery(`{
      micropostById(id: "${micropostId}") {
        text,
        createdAt,
        beautifulPerson: author {
          nickname: handle
        },
        tags
      }
    }`);

    assert.deepEqual(micropostResult, {
      data: {
        micropostById: {
          beautifulPerson: {
            nickname: 'user-0',
          },
          createdAt: micropost.createdAt,
          text: micropost.text,
          tags: micropost.tags,
        },
      },
    });

    const user = values(fixtures.User)[0];
    const firstMicropost = sortBy(values(fixtures.Micropost),
      (post) => post.createdAt
    )[0];
    const userId = user.id;

    const userResult = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          handle,
          posts: microposts(orderBy: CREATED_AT_ASC, first: 1) {
            count,
            nodes {
              createdAt,
              text,
            }
          },
          microposts {
            count,
          },
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(userResult, {
      data: {
        userById: {
          handle: user.handle,
          posts: {
            count: 20,
            nodes: [
              {
                createdAt: firstMicropost.createdAt,
                text: firstMicropost.text,
              },
            ],
          },
          microposts: {
            count: 20,
          },
        },
      },
    });
  });

  it('queries through unique fields', async () => {
    const result = await runQuery(`
      {
        userByHandle(handle: "user-0") {
          handle
        }
      }`
    );

    assert.deepEqual(result, {
      data: {
        userByHandle: {
          handle: 'user-0',
        },
      },
    });

    assert.deepEqual(await runQuery(`
      {
        userByHandle(handle: "nonsense") {
          handle
        }
      }
    `), {
      data: {
        userByHandle: null,
      },
    });
  });

  it('queries viewer for user', async function () {
    const user = values(fixtures.User)[0];
    const credentials = { isAdmin: true, userID: fromReindexID(user.id) };
    assert.deepEqual(
      await runQuery(`{ viewer { user { handle } } }`, null, { credentials }),
      { data: { viewer: { user: { handle: user.handle } } } }
    );
  });

  it('queries viewer list', async function() {
    const microposts = sortBy(
      values(fixtures.Micropost), (post) => post.createdAt
    ).map((post) => ({
      text: post.text,
    }));
    assert.deepEqual(
      await runQuery(`{
        viewer {
          allReindexTypes {
            count
          }
          allMicroposts(first: 20, orderBy: CREATED_AT_ASC) {
            nodes {
              text,
            }
          }
        }
      }`),
      {
        data: {
          viewer: {
            allReindexTypes: {
              count: 3,
            },
            allMicroposts: {
              nodes: microposts,
            },
          },
        },
      }
    );
  });

  it('treats ReindexViewer as a Node', async () => {
    const result = await runQuery(`{ viewer { id }}`);
    assert.deepProperty(result, 'data.viewer.id', 'viewer should have an ID');
    const viewer = get(result, ['data', 'viewer']);

    const nodeResult = await runQuery(
      `query ($id: ID!) { node(id: $id) { id } }`,
      { id: viewer.id },
    );
    assert.deepEqual(nodeResult, { data: { node: viewer } });
  });

  it('works with edges and cursor', async function () {
    const user = values(fixtures.User)[0];
    const microposts = values(fixtures.Micropost);
    const cursors = microposts.map((post) => toCursor({
      value: fromReindexID(post.id).value,
    }));
    const userId = user.id;

    const result = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          microposts(first: 1) {
            count,
            edges {
              cursor,
              node {
                text
              }
            },
            pageInfo {
              hasPreviousPage,
              hasNextPage,
            }
          }
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(result, {
      data: {
        userById: {
          microposts: {
            count: 20,
            edges: [
              {
                cursor: cursors[0],
                node: {
                  text: microposts[0].text,
                },
              },
            ],
            pageInfo: {
              hasPreviousPage: false,
              hasNextPage: true,
            },
          },
        },
      },
    });

    const lastResult = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          microposts(last: 1) {
            count,
            edges {
              cursor,
              node {
                text
              }
            },
            pageInfo {
              hasPreviousPage,
              hasNextPage,
            }
          }
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(lastResult, {
      data: {
        userById: {
          microposts: {
            count: 20,
            edges: [
              {
                cursor: last(cursors),
                node: {
                  text: last(microposts).text,
                },
              },
            ],
            pageInfo: {
              hasPreviousPage: true,
              hasNextPage: false,
            },
          },
        },
      },
    });

    const paginatedResult = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          microposts(first: 1, after: "${cursors[0]}") {
            count,
            edges {
              cursor,
              node {
                text
              }
            },
            pageInfo {
              hasPreviousPage,
              hasNextPage,
            }
          }
        }
      }
    `, {
      id: userId,
    });

    assert.deepEqual(paginatedResult, {
      data: {
        userById: {
          microposts: {
            count: 20,
            edges: [
              {
                cursor: cursors[1],
                node: {
                  text: microposts[1].text,
                },
              },
            ],
            pageInfo: {
              hasPreviousPage: false,
              hasNextPage: true,
            },
          },
        },
      },
    });
  });

  it('always returns the total count for a connection', async function () {
    const query = `
      query ($after: Cursor) {
        viewer {
          allMicroposts(after: $after) {
            count
            edges { cursor }
          }
        }
      }
    `;
    const result = await runQuery(query, { after: null });
    const microposts = get(result, ['data', 'viewer', 'allMicroposts']);
    const cursor = microposts.edges[0].cursor;
    const paginatedResult = await runQuery(query, { after: cursor });
    assert.equal(
      microposts.count,
      get(paginatedResult, ['data', 'viewer', 'allMicroposts', 'count']),
    );
  });

  it('does crud', async function() {
    const clientMutationId = 'my-client-mutation-id';
    const created = await runQuery(`
      mutation createUser($input: _CreateUserInput!) {
        createUser(input: $input) {
          clientMutationId,
          id,
          changedUser {
            id,
            handle,
            email
          },
          changedUserEdge {
            node {
              id
            },
            cursor
          },
          viewer {
            allUsers {
              count
            }
          }
        }
      }
    `, {
      input: {
        clientMutationId,
        handle: 'immonenv',
        email: 'immonenv@example.com',
      },
    });

    const id = get(created, ['data', 'createUser', 'changedUser', 'id']);

    assert.deepEqual(created, {
      data: {
        createUser: {
          clientMutationId,
          id,
          changedUser: {
            id,
            handle: 'immonenv',
            email: 'immonenv@example.com',
          },
          changedUserEdge: {
            node: {
              id,
            },
            cursor: id && toCursor({
              value: fromReindexID(id).value,
            }),
          },
          viewer: {
            allUsers: {
              count: 3,
            },
          },
        },
      },
    }, 'create works');

    assert.isDefined(id, 'created with proper id');

    const updated = await runQuery(`
      mutation updateUser($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          clientMutationId,
          changedUser {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        id,
        handle: 'villeimmonen',
      },
    });

    assert.deepEqual(updated, {
      data: {
        updateUser: {
          clientMutationId: null,
          changedUser: {
            id,
            handle: 'villeimmonen',
            email: 'immonenv@example.com',
          },
        },
      },
    }, 'update works');

    const replaced = await runQuery(`
      mutation replaceUser($input: _ReplaceUserInput!) {
        replaceUser(input: $input) {
          clientMutationId,
          changedUser {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        id,
        clientMutationId,
        handle: 'immonenv',
      },
    });

    assert.deepEqual(replaced, {
      data: {
        replaceUser: {
          clientMutationId,
          changedUser: {
            id,
            handle: 'immonenv',
            email: null,
          },
        },
      },
    }, 'replace works');

    const deleted = await runQuery(`
      mutation deleteUser($input: _DeleteUserInput!) {
        deleteUser(input: $input) {
          clientMutationId,
          changedUser {
            id,
            handle,
            email
          }
        }
      }
    `, {
      input: {
        id,
        clientMutationId,
      },
    });

    assert.deepEqual(deleted.data.deleteUser, replaced.data.replaceUser,
      'delete returns deleted data');

    const afterDeleted = await runQuery(`
      query userById($id: ID!) {
        userById(id: $id) {
          id,
          handle,
          email
        }
      }
    `, {
      id,
    });

    assert.isNull(afterDeleted.data.userById,
      'delete really deletes data');
  });

  it('saves connections correctly', async function() {
    const author = values(fixtures.User)[0];
    const authorID = author.id;
    const micropost = {
      text: 'Sample text',
      createdAt: '2014-05-12T18:00:00.000Z',
      author: authorID,
    };
    const result = await runQuery(`
      mutation postMicropost($input: _CreateMicropostInput!) {
        createMicropost(input: $input) {
          changedMicropost {
            text,
            createdAt,
            author {
              id
            }
          },
          author {
            id
          }
        }
      }
    `, {
      input: {
        clientMutationId: '1',
        ...micropost,
      },
    });

    assert.deepEqual(result, {
      data: {
        createMicropost: {
          changedMicropost: {
            ...micropost,
            createdAt: micropost.createdAt,
            author: {
              id: authorID,
            },
          },
          author: {
            id: authorID,
          },
        },
      },
    });
  });

  it('checks that the object to mutate exists', async () => {
    const micropost = values(fixtures.Micropost)[0];
    const nonExistentId = toReindexID({
      ...fromReindexID(micropost.id),
      type: 'User',
    });
    const result = await runQuery(`
      mutation ($id: ID!) {
        updateUser(input: { id: $id }) { id }
        replaceUser(input: { id: $id }) { id }
        deleteUser(input: { id: $id }) { id }
      }
    `, { id: nonExistentId }, {
      printErrors: false,
    });

    const error = {
      message: 'input.id: Can not find User object with given ID: ' +
        nonExistentId,
    };
    assert.deepEqual(result, {
      data: {
        updateUser: null,
        replaceUser: null,
        deleteUser: null,
      },
      errors: [error, error, error],
    });
  });

  it('validates that related nodes exist', async function () {
    const micropost = values(fixtures.Micropost)[0];
    const idNotFound = toReindexID({
      ...fromReindexID(micropost.id),
      type: 'User',
    });
    const idInvalidType = toReindexID({
      type: 'ReindexViewer',
      value: 'viewer',
    });
    const idMalformed = toReindexID({
      type: 'User',
      value: 'bogus',
    });
    const result = await runQuery(`
      mutation postMicropost(
        $post1: _CreateMicropostInput!
        $post2: _CreateMicropostInput!
        $post3: _CreateMicropostInput!
      ) {
        post1: createMicropost(input: $post1) { id }
        post2: createMicropost(input: $post2) { id }
        post3: createMicropost(input: $post3) { id }
      }
    `, {
      post1: {
        text: 'Post 1',
        createdAt: '2016-05-12T18:00:00.000Z',
        author: idNotFound,
      },
      post2: {
        text: 'Post 2',
        createdAt: '2016-06-12T18:00:00.000Z',
        author: idInvalidType,
      },
      post3: {
        text: 'Post 3',
        createdAt: '2016-07-12T18:00:00.000Z',
        author: idMalformed,
      },
    }, {
      printErrors: false,
    });

    assert.deepEqual(result, {
      data: {
        post1: null,
        post2: null,
        post3: null,
      },
      errors: [
        {
          message:
            `Micropost.author: User with ID "${idNotFound}" does not exist.`,
        },
        {
          message:
            `Micropost.author: Invalid ID for type User: ${idInvalidType}`,
        },
        {
          message:
            `Micropost.author: Invalid ID for type User: ${idMalformed}`,
        },
      ],
    });
  });

  it('validates uniqueness', async () => {
    const user1 = values(fixtures.User)[0];
    const user2 = values(fixtures.User)[1];
    const id = user1.id;

    let result = await runQuery(`
      mutation createDuplicateUser($input: _CreateUserInput!) {
        createUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        handle: user2.handle,
      },
    }, {
      printErrors: false,
    });

    assert.deepEqual(result, {
      data: {
        createUser: null,
      },
      errors: [
        {
          message: `User.handle: value must be unique, got "${user2.handle}"`,
        },
      ],
    });

    result = await runQuery(`
      mutation updateUserToDuplicate($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        id,
        handle: user2.handle,
      },
    }, {
      printErrors: false,
    });

    assert.deepEqual(result, {
      data: {
        updateUser: null,
      },
      errors: [
        {
          message: `User.handle: value must be unique, got "${user2.handle}"`,
        },
      ],
    });

    result = await runQuery(`
      mutation replaceUserToDuplicate($input: _ReplaceUserInput!) {
        replaceUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        id,
        handle: user2.handle,
      },
    }, {
      printErrors: false,
    });

    assert.deepEqual(result, {
      data: {
        replaceUser: null,
      },
      errors: [
        {
          message: `User.handle: value must be unique, got "${user2.handle}"`,
        },
      ],
    });

    result = await runQuery(`
      mutation updateUserToSame($input: _UpdateUserInput!) {
        updateUser(input: $input) {
          changedUser {
            handle
          }
        }
      }
    `, {
      input: {
        id,
        handle: user1.handle,
      },
    });

    assert.deepEqual(result, {
      data: {
        updateUser: {
          changedUser: {
            handle: user1.handle,
          },
        },
      },
    });
  });

  it('saves arrays and embedded objects correctly', async function() {
    const micropost = {
      text: 'GraphQL is awesome',
      tags: [
        'graphql',
      ],
      categories: [
        {
          name: 'Programming',
        },
        {
          name: 'Art',
        },
      ],
      mainCategory: {
        name: 'Programming',
      },
    };
    const result = await runQuery(`
      mutation postMicropost($input: _CreateMicropostInput!) {
        createMicropost(input: $input) {
          changedMicropost {
            text,
            tags,
            categories { name },
            mainCategory { name }
          }
        }
      }
    `, {
      input: {
        clientMutationId: '1',
        ...micropost,
      },
    });

    assert.deepEqual(result, {
      data: {
        createMicropost: {
          changedMicropost: micropost,
        },
      },
    });
  });

  it('creates a secret', async function() {
    const result = await runQuery(`
      mutation secret {
        createReindexSecret(input: {clientMutationId: "mutation"}) {
          changedReindexSecret {
            value
          }
        }
      }
    `);

    assert.match(
      result.data.createReindexSecret.changedReindexSecret.value,
      /^[a-zA-Z0-9_-]{40}$/
    );
  });

  it('handles null nodes and inlines', async function() {
    let result = await runQuery(`
      mutation createMicropost($input: _CreateMicropostInput!) {
        createMicropost(input: $input) {
          changedMicropost {
            id,
            text,
            author {
              id
            },
            categories {
              name
            },
            mainCategory {
              name
            },
          }
        }
      }`,
      {
        input: {
          text: 'Test',
        },
      }
    );

    const id = get(result, [
      'data', 'createMicropost', 'changedMicropost', 'id',
    ]);

    assert.deepEqual(result, {
      data: {
        createMicropost: {
          changedMicropost: {
            id,
            text: 'Test',
            author: null,
            categories: null,
            mainCategory: null,
          },
        },
      },
    });

    assert.isDefined(id, 'created with proper id');

    result = await runQuery(`
      query micropostById($id: ID!) {
        micropostById(id: $id) {
          id,
          text,
          author {
            id,
          },
          categories {
            name,
          },
          mainCategory {
            name,
          },
        },
      }
    `, {
      id,
    });

    assert.deepEqual(result, {
      data: {
        micropostById: {
          id,
          text: 'Test',
          author: null,
          categories: null,
          mainCategory: null,
        },
      },
    });

    result = await runQuery(`
      mutation deleteMicropost($input: _DeleteMicropostInput!) {
        deleteMicropost(input: $input) {
          id,
        }
      }`,
      {
        input: {
          id,
        },
      }
    );

    assert.deepEqual(result, {
      data: {
        deleteMicropost: {
          id,
        },
      },
    });
  });

  if (!process.env.DATABASE_TYPE ||
      process.env.DATABASE_TYPE === DatabaseTypes.MongoDB) {
    it('handles many-to-many connections', async () => {
      const user1 = values(fixtures.User)[0];
      const user2 = values(fixtures.User)[1];
      const micropost = values(fixtures.Micropost)[0];

      const fragment = `
        changedUser {
          id,
          favorites {
            count,
            nodes {
              id,
            }
          }
        },
        changedMicropost {
          id,
          favoritedBy {
            count,
            nodes {
              id,
            }
          }
        }
      `;
      const query = `
        mutation favorite($input: _MicropostUserFavoritesConnectionInput!) {
          addMicropostToUserFavorites(input: $input) {
            ${fragment}
          }
        }
      `;

      let result = await runQuery(query, {
        input: {
          micropostId: micropost.id,
          userId: user1.id,
        },
      });

      const sampleResult = {
        data: {
          addMicropostToUserFavorites: {
            changedUser: {
              id: user1.id,
              favorites: {
                count: 1,
                nodes: [
                  {
                    id: micropost.id,
                  },
                ],
              },
            },
            changedMicropost: {
              id: micropost.id,
              favoritedBy: {
                count: 1,
                nodes: [
                  {
                    id: user1.id,
                  },
                ],
              },
            },
          },
        },
      };

      assert.deepEqual(result, sampleResult, 'Adding works');

      result = await runQuery(query, {
        input: {
          micropostId: micropost.id,
          userId: user1.id,
        },
      });

      assert.deepEqual(result, sampleResult, 'Repeated adding is noop');

      result = await runQuery(query, {
        input: {
          micropostId: micropost.id,
          userId: user1.id,
        },
      });

      const micropostFetchResult = await runQuery(`
        query micropostById($id: ID!){
          micropostById(id: $id) {
            id,
            favoritedBy {
              count,
              nodes {
                id,
              }
            }
          }
        }
      `, {
        id: micropost.id,
      });

      assert.deepEqual(micropostFetchResult, {
        data: {
          micropostById: {
            id: micropost.id,
            favoritedBy: {
              count: 1,
              nodes: [
                {
                  id: user1.id,
                },
              ],
            },
          },
        },
      }, 'fetching returns same data');

      const userFetchResult = await runQuery(`
        query userById($id: ID!){
          userById(id: $id) {
            id,
            favorites {
              count,
              nodes {
                id,
              }
            }
          }
        }
      `, {
        id: user1.id,
      });

      assert.deepEqual(userFetchResult, {
        data: {
          userById: {
            id: user1.id,
            favorites: {
              count: 1,
              nodes: [
                {
                  id: micropost.id,
                },
              ],
            },
          },
        },
      });

      result = await runQuery(query, {
        input: {
          micropostId: micropost.id,
          userId: user2.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          addMicropostToUserFavorites: {
            changedUser: {
              id: user2.id,
              favorites: {
                count: 1,
                nodes: [
                  {
                    id: micropost.id,
                  },
                ],
              },
            },
            changedMicropost: {
              id: micropost.id,
              favoritedBy: {
                count: 2,
                nodes: [
                  {
                    id: user1.id,
                  },
                  {
                    id: user2.id,
                  },
                ],
              },
            },
          },
        },
      }, 'added second');

      const removeQuery = `
        mutation unfavorite($input: _MicropostUserFavoritesConnectionInput!) {
          removeMicropostFromUserFavorites(input: $input) {
            ${fragment}
          }
        }
      `;

      const removeSampleResult = {
        data: {
          removeMicropostFromUserFavorites: {
            changedUser: {
              id: user2.id,
              favorites: {
                count: 0,
                nodes: [],
              },
            },
            changedMicropost: {
              id: micropost.id,
              favoritedBy: {
                count: 1,
                nodes: [
                  {
                    id: user1.id,
                  },
                ],
              },
            },
          },
        },
      };


      result = await runQuery(removeQuery, {
        input: {
          micropostId: micropost.id,
          userId: user2.id,
        },
      });

      assert.deepEqual(result, removeSampleResult, 'Removing works');

      result = await runQuery(removeQuery, {
        input: {
          micropostId: micropost.id,
          userId: user2.id,
        },
      });

      assert.deepEqual(result, removeSampleResult,
        'Removing second time does nothing works');

      result = await runQuery(removeQuery, {
        input: {
          micropostId: micropost.id,
          userId: user1.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          removeMicropostFromUserFavorites: {
            changedUser: {
              id: user1.id,
              favorites: {
                count: 0,
                nodes: [],
              },
            },
            changedMicropost: {
              id: micropost.id,
              favoritedBy: {
                count: 0,
                nodes: [],
              },
            },
          },
        },
      });
    });

    it('handles many-to-many connections to itself', async () => {
      const user1 = values(fixtures.User)[0];
      const user2 = values(fixtures.User)[1];

      const fragment = `
        changedFollowersUser {
          id
          followers {
            count
            nodes {
              id
            }
          }
          following {
            count
            nodes {
              id
            }
          }
        }
        changedFollowingUser {
          id,
          followers {
            count
            nodes {
              id
            }
          }
          following {
            count
            nodes {
              id
            }
          }
        }
      `;
      const query = `
        mutation follow($input: _UserFollowingConnectionInput!) {
          addUserToUserFollowing(input: $input) {
            ${fragment}
          }
        }
      `;
      const removeQuery = `
        mutation follow($input: _UserFollowingConnectionInput!) {
          removeUserFromUserFollowing(input: $input) {
            ${fragment}
          }
        }
      `;

      let result = await runQuery(query, {
        input: {
          followingId: user1.id,
          followersId: user2.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          addUserToUserFollowing: {
            changedFollowingUser: {
              id: user1.id,
              followers: {
                count: 0,
                nodes: [],
              },
              following: {
                count: 1,
                nodes: [
                  {
                    id: user2.id,
                  },
                ],
              },
            },
            changedFollowersUser: {
              id: user2.id,
              followers: {
                count: 1,
                nodes: [
                  {
                    id: user1.id,
                  },
                ],
              },
              following: {
                count: 0,
                nodes: [],
              },
            },
          },
        },
      });

      result = await runQuery(query, {
        input: {
          followingId: user2.id,
          followersId: user1.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          addUserToUserFollowing: {
            changedFollowingUser: {
              id: user2.id,
              followers: {
                count: 1,
                nodes: [
                  {
                    id: user1.id,
                  },
                ],
              },
              following: {
                count: 1,
                nodes: [
                  {
                    id: user1.id,
                  },
                ],
              },
            },
            changedFollowersUser: {
              id: user1.id,
              followers: {
                count: 1,
                nodes: [
                  {
                    id: user2.id,
                  },
                ],
              },
              following: {
                count: 1,
                nodes: [
                  {
                    id: user2.id,
                  },
                ],
              },
            },
          },
        },
      });

      await runQuery(removeQuery, {
        input: {
          followingId: user2.id,
          followersId: user1.id,
        },
      });

      result = await runQuery(removeQuery, {
        input: {
          followingId: user1.id,
          followersId: user2.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          removeUserFromUserFollowing: {
            changedFollowingUser: {
              id: user1.id,
              followers: {
                count: 0,
                nodes: [],
              },
              following: {
                count: 0,
                nodes: [],
              },
            },
            changedFollowersUser: {
              id: user2.id,
              followers: {
                count: 0,
                nodes: [],
              },
              following: {
                count: 0,
                nodes: [],
              },
            },
          },
        },
      });
    });

    it('handles symmetrical many-to-many connections to itself', async () => {
      const user1 = values(fixtures.User)[0];
      const user2 = values(fixtures.User)[1];

      const fragment = `
        changedUser1 {
          id
          friends {
            count
            nodes {
              id
            }
          }
        }
        changedUser2 {
          id
          friends {
            count
            nodes {
              id
            }
          }
        }
      `;
      const query = `
        mutation friend($input: _UserFriendsConnectionInput!) {
          addUserToUserFriends(input: $input) {
            ${fragment}
          }
        }
      `;
      const removeQuery = `
        mutation unfriend($input: _UserFriendsConnectionInput!) {
          removeUserFromUserFriends(input: $input) {
            ${fragment}
          }
        }
      `;

      let result = await runQuery(query, {
        input: {
          user1Id: user1.id,
          user2Id: user2.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          addUserToUserFriends: {
            changedUser1: {
              id: user1.id,
              friends: {
                count: 1,
                nodes: [
                  {
                    id: user2.id,
                  },
                ],
              },
            },
            changedUser2: {
              id: user2.id,
              friends: {
                count: 1,
                nodes: [
                  {
                    id: user1.id,
                  },
                ],
              },
            },
          },
        },
      });

      result = await runQuery(removeQuery, {
        input: {
          user1Id: user2.id,
          user2Id: user1.id,
        },
      });

      assert.deepEqual(result, {
        data: {
          removeUserFromUserFriends: {
            changedUser1: {
              id: user2.id,
              friends: {
                count: 0,
                nodes: [],
              },
            },
            changedUser2: {
              id: user1.id,
              friends: {
                count: 0,
                nodes: [],
              },
            },
          },
        },
      });
    });
  }
});
