import fetch from 'isomorphic-fetch';
import React from 'react';
import GraphiQL from 'graphiql';

import Reindex from './Reindex';

import './App.css';
import 'graphiql/graphiql.css';

function parseQuery(queryString) {
  const query = {};
  const parts = queryString.substr(1).split('&');
  for (const part of parts) {
    const [key, value] = part.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

async function graphQLFetcher(graphQLParams) {
  const response = await Reindex.query(
    graphQLParams.query,
    graphQLParams.variables && JSON.parse(graphQLParams.variables),
  );
  return await response.json();
}

export default class App extends React.Component {
  componentWillMount() {
    if (document.location.search) {
      const query = parseQuery(document.location.search);
      if (query.token) {
        Reindex.setToken(query.token);
        document.location = '/';
      }
    }
  }

  render() {
    if (Reindex.isLoggedIn()) {
      return <GraphiQL fetcher={graphQLFetcher} />;
    } else {
      return (
        <div className="not-logged-in">
          <h1>Welcome to Reindex!</h1>
          <p>
            You probably wanted to go to&nbsp;
            <a href="https://www.reindex.io">
              our main website
            </a>.
          </p>
        </div>
      );
    }
  }
}
