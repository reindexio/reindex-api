import Promise from 'bluebird';
import uuid from 'uuid';
import { testSetup, testTearDown } from './testAppUtils';

Promise.longStackTraces();

const adminHostname = `test.admin.${uuid.v4()}.example.com`;

before(() => testSetup(adminHostname));

after(() => testTearDown(adminHostname));
