import { decodeParams as urlDecodeParams } from '../url.js';

async function queryStringDecoderMiddleware(request) {
  const [match, queryString] = /^.+?\?(.+)$/.exec(request.path);

  if (match) {
    request.queryParams = urlDecodeParams(queryString);
  }

  return true;
}

export { queryStringDecoderMiddleware };
