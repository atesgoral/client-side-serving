import { encodeCookieHeader, decodeCookieHeader } from '../cookie.js';

async function cookieEncoderMiddleware(request) {
  request.headers.push({ key: 'Cookie', value: encodeCookieHeader(request.cookies) });
  return true;
}

async function cookieDecoderMiddleware(request) {
  const cookieHeader = request.headers.find(({ key }) => key === 'Cookie');

  if (cookieHeader) {
    request.cookies = decodeCookieHeader(cookieHeader.value);
  }

  return true;
}

export { cookieEncoderMiddleware, cookieDecoderMiddleware };
