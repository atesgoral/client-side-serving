import {
  encodeParams as urlEncodeParams,
  decodeParams as urlDecodeParams
} from '../url.js';

const bodyContentTypeHandlers = {
  'text/plain': {
    encode: String,
    decode: String
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
    const utf8Encoder = new TextEncoder();
    const encoded = utf8Encoder.encode(bodyContentTypeHandler.encode(request.body));

    request.body = encoded;
    request.contentLength = encoded.length;
  }

  return true;
}

async function bodyDecoderMiddleware(request) {
  const bodyContentTypeHandler = bodyContentTypeHandlers[request.contentType];

  if (bodyContentTypeHandler) {
    const utf8Decoder = new TextDecoder();
    const decoded = utf8Decoder.decode(bodyContentTypeHandler.decode(request.body));

    request.body = decoded;
  }

  return true;
}

export { bodyEncoderMiddleware, bodyDecoderMiddleware };
