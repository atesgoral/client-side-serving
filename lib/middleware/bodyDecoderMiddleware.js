import { decodeParams as urlDecodeParams } from '../url.js';

const bodyDecoders = {
  'text/plain': {
    decode(body) {
      return body;
    }
  },
  'application/x-www-form-urlencoded': {
    decode: urlDecodeParams
  },
  'application/json': {
    decode: JSON.parse
  }
}

async function bodyDecoderMiddleware(request) {
  const bodyDecoder = bodyDecoders[request.contentType];

  if (bodyDecoder) {
    request.body = bodyDecoder.decode(request.body);
  }

  return true;
}

export { bodyDecoderMiddleware };
