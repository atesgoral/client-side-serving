function commonHeaderEncoderMiddleware(request) {
  request.headers['Content-Length'] = request.contentLength;
  request.headers['Content-Type'] = request.contentType;
}

function commonHeaderDecoderMiddleware(request) {
  request.contentLength = parseInt(request.headers['Content-Length']);
  request.contentType = request.headers['Content-Type'];
}

export { commonHeaderEncoderMiddleware, commonHeaderDecoderMiddleware };
