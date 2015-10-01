import Qs from 'qs';
import React from 'react';
import ReactDOM from 'react-dom';

import GraphiQLView from './GraphiQLView';
import NotLoggedIn from './NotLoggedIn';
import Reindex from './Reindex';

import 'graphiql/graphiql.css';

const root = document.getElementById('root');
const parameters = Qs.parse(window.location.search.slice(1));

if (parameters.variables) {
  try {
    parameters.variables =
      JSON.stringify(JSON.parse(parameters.variables), null, 2);
  } catch (e) {
    // Do nothing, we want to display the invalid JSON as a string, rather
    // than present an error.
  }
}

if (parameters.token) {
  Reindex.setToken(parameters.token);
  window.location = '/';
} else if (Reindex.isLoggedIn()) {
  ReactDOM.render(
    <GraphiQLView initialParameters={parameters} reindex={Reindex} />,
    root
  );
} else {
  ReactDOM.render(<NotLoggedIn />, root);
}
