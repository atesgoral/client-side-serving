import { encodeCookieHeader, decodeCookieHeader } from '../cookie.js';

async function cookieEncoderMiddleware(request) {
  request.headers['Cookie'] = encodeCookieHeader(request.cookies);
  return true;
}

async function cookieDecoderMiddleware(request) {
  request.cookies = decodeCookieHeader(request.headers['Cookie']);
  return true;
}

export { cookieEncoderMiddleware, cookieDecoderMiddleware };
