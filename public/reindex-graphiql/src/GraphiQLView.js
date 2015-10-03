/* globals Intercom */
import GraphiQL from 'graphiql';
import React from 'react';
import Qs from 'qs';
import { introspectionQuery } from 'graphql/utilities';

export default class GraphiQLView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: props.initialParameters.query,
      variables: props.initialParameters.variables,
    };
  }

  updateURL() {
    const parameters = {
      query: this.state.query,
      variables: this.state.variables,
    };
    history.replaceState(null, null, '?' + Qs.stringify(parameters));
  }

  fetchGraphQL = ({ query, variables }) => (
    this.props.reindex.query(query, variables && JSON.parse(variables))
      .then((result) => {
        if (query !== introspectionQuery && result) {
          const rootField = result.data && Object.keys(result.data)[0];
          const errors = result.errors &&
            result.errors.map((e) => e.message).join(',');
          Intercom('trackEvent', 'executed-a-query-in-GraphiQL', {
            rootField,
            errors,
            url: location.href,
          });
        }
        return result;
      })
      .catch((error) => {
        Intercom('trackEvent', 'executed-a-query-in-GraphiQL', {
          errors: error.message,
          url: location.href,
        });
        if (!error.stack) {
          error.stack = error.message;
        }
        throw error;
      })
  );

  handleEditQuery = (query) => {
    this.setState({ query });
    this.updateURL();
  };

  handleEditVariables = (variables) => {
    this.setState({ variables });
    this.updateURL();
  };

  render() {
    return (
      <GraphiQL
        fetcher={this.fetchGraphQL}
        query={this.state.query}
        variables={this.state.variables}
        onEditQuery={this.handleEditQuery}
        onEditVariables={this.handleEditVariables} />
    );
  }
}
