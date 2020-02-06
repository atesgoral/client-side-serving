import { HttpMessageParser, HeaderSyntaxError } from './httpMessageParser.js';

class RequestLineSyntaxError extends Error {}

function parseRequestLine(line) {
  const [match, method, path, protocol] = /^(.+?) (.+?) (.+)$/.exec(line);

  if (!match) {
    throw new RequestSyntaxError(`Malformed request line: ${line}`);
  } else {
    return { method, path, protocol };
  }
}

class HttpRequestParser extends HttpMessageParser {
  parseFirstLine = parseRequestLine

  constructor({ onHttpRequest, onError }) {
    super({ onHttpMessage: onHttpRequest, onError });
  }
}

export { HttpRequestParser, RequestLineSyntaxError, HeaderSyntaxError };
