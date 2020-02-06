import { HttpMessageFormatter } from './httpMessageFormatter.js';

function formatRequestLine({ protocol, method, path }) {
  return `${method} ${path} ${protocol}`;
}

class HttpRequestFormatter extends HttpMessageFormatter {
  format(request) {
    this.emitLine(formatRequestLine(request));
    this.emitHeaders(request);
    this.emitLine('');

    request.body && this.emitData(request.body);

    this.onEnd && this.onEnd();
  }
}

export { HttpRequestFormatter };
