import { HttpMessageFormatter } from './httpMessageFormatter.js';

function formatStatusLine({ protocol, statusCode, statusText }) {
  return `${protocol} ${statusCode} ${statusText}`;
}

class HttpResponseFormatter extends HttpMessageFormatter {
  format(response) {
    this.emitLine(formatStatusLine(response));
    this.emitHeaders(response);
    this.emitLine('');

    response.body && this.emitData(response.body);

    this.onEnd && this.onEnd();
  }
}

export { HttpResponseFormatter };
