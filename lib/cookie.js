function encodeCookieHeader(cookies) {
  return cookies.join('; ');
}

function decodeCookieHeader(encoded) {
  return encoded && encoded.split('; ');
}

export { encodeCookieHeader, decodeCookieHeader };
