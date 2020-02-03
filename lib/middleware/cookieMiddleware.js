function decodeCookies(encoded) {
  return encoded && encoded.split('; ');
}

async function cookieMiddleware(request) {
  const cookies = decodeCookies(request.headers['Cookie']);
  request.cookies = cookies;
  return true;
}

export { cookieMiddleware };
