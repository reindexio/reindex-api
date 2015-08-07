const JSON_NOT_WHITELISTED = /[^\x22,\-\.0-9:A-Z\[\x5C\]_a-z{}]/g;
const CDATA_CLOSE = /\]\](?:>|\\x3E|\\u003E)/gi;

// Adapted from secure-filters jsObj
export default function escapeScriptJSON(val) {
  return val
    .replace(JSON_NOT_WHITELISTED, jsSlashEncoder)
    // prevent breaking out of CDATA context.  Escaping < below is sufficient
    // to prevent opening a CDATA context.
    .replace(CDATA_CLOSE, '\\x5D\\x5D\\x3E');
}

function jsSlashEncoder(charStr) {
  const code = charStr.charCodeAt(0);
  const hex = code.toString(16).toUpperCase();
  if (code < 0x80) { // ASCII
    if (hex.length === 1) {
      return '\\x0' + hex;
    } else {
      return '\\x' + hex;
    }
  } else { // Unicode
    switch (hex.length) {
      case 2:
        return '\\u00' + hex;
      case 3:
        return '\\u0' + hex;
      case 4:
        return '\\u' + hex;
      default:
        // charCodeAt() JS shouldn't return code > 0xFFFF, and only four hex
        // digits can be encoded via `\u`-encoding, so return REPLACEMENT
        // CHARACTER U+FFFD.
        return '\\uFFFD';
    }
  }
}
