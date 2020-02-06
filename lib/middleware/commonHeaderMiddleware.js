function commonHeaderEncoderMiddleware(request) {
  request.headers.push({ key: 'Content-Length', value: request.contentLength });
  request.headers.push({ key: 'Content-Type',  value: request.contentType });
}

function commonHeaderDecoderMiddleware(request) {
  const contentLengthHeader = request.headers.find(({ key }) => key === 'Content-Length');

  if (contentLengthHeader) {
    request.contentLength = parseInt(contentLengthHeader.value);
  }

  const contentTypeHeader = request.headers.find(({ key }) => key === 'Content-Type');

  if (contentTypeHeader) {
    request.contentType = contentTypeHeader.value;
  }

  return true;
}

export { commonHeaderEncoderMiddleware, commonHeaderDecoderMiddleware };
