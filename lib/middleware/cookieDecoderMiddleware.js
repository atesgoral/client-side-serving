import { decodeCookieHeader } from '../cookie.js';

async function cookieDecoderMiddleware(request) {
  const cookies = decodeCookieHeader(request.headers['Cookie']);
  request.cookies = cookies;
  return true;
}

export { cookieDecoderMiddleware };
