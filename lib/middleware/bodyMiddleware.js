import {
  encodeParams as urlEncodeParams,
  decodeParams as urlDecodeParams
} from '../url.js';

const bodyContentTypeHandlers = {
  'text/plain': {
    encode: (body) => body,
    decode: (body) => body
  },
  'application/x-www-form-urlencoded': {
    encode: urlEncodeParams,
    decode: urlDecodeParams
  },
  'application/json': {
    encode: JSON.stringify,
    decode: JSON.parse
  }
};

async function bodyEncoderMiddleware(request) {
  const bodyContentTypeHandler = bodyContentTypeHandlers[request.contentType];

  if (bodyContentTypeHandler) {
    request.body = bodyContentTypeHandler.encode(request.body);
    request.contentLength = request.body.length;
  }

  return true;
}

async function bodyDecoderMiddleware(request) {
  const bodyContentTypeHandler = bodyContentTypeHandlers[request.contentType];

  if (bodyContentTypeHandler) {
    request.body = bodyContentTypeHandler.decode(request.body);
  }

  return true;
}

export { bodyEncoderMiddleware, bodyDecoderMiddleware };
