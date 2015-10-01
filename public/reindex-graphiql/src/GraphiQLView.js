import GraphiQL from 'graphiql';
import React from 'react';
import Qs from 'qs';

function updateURL(parameters) {
  history.replaceState(null, null, '?' + Qs.stringify(parameters));
}

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
    }
    history.replaceState(null, null, '?' + Qs.stringify(parameters));
  }

  fetchGraphQL = ({ query, variables }) => {
    return this.props.reindex.query(query, variables && JSON.parse(variables));
  }

  handleEditQuery = (query) => {
    this.setState({ query })
    this.updateURL();
  };

  handleEditVariables = (variables) => {
    this.setState({ variables })
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
    )
  }
}
