import Base64Url from 'base64-url';

export default function databaseNameFromHostname(hostname) {
  return 'reindex_' + Base64Url.encode(hostname);
}
