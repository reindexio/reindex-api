import React from 'react';

import './NotLoggedIn.css';

export default function NotLoggedIn() {
  return (
    <div className="NotLoggedIn">
      <h1>Welcome to Reindex!</h1>
      <p>
        You probably wanted to go to
        {' '}
        <a href="https://www.reindex.io">
          our main website
        </a>.
      </p>
    </div>
  );
}
