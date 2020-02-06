import { HttpMessageParser, HeaderSyntaxError } from './httpMessageParser.js';

class StatusLineSyntaxError extends Error {}

function parseStatusLine(line) {
  const [match, protocol, statusCode, statusText] = /^(.+?) (\d+?) (.+)$/.exec(line);

  if (!match) {
    throw new StatusLineSyntaxError(`Malformed status line: ${line}`);
  } else {
    return { protocol, statusCode: parseInt(statusCode), statusText };
  }
}

class HttpResponseParser extends HttpMessageParser {
  parseFirstLine = parseStatusLine

  constructor({ onHttpResponse, onError }) {
    super({ onHttpMessage: onHttpResponse, onError });
  }
}

export { HttpResponseParser, StatusLineSyntaxError, HeaderSyntaxError };
