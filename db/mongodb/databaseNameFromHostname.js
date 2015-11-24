export default function databaseNameFromHostname(hostname) {
  return 'r_' + hostname.replace(/\./g, '_');
}
