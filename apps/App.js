import {List, Record} from 'immutable';

const App = Record({
  dbName: null,
  schema: null,
  secrets: List(),
});

export default App;
