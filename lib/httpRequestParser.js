import { LineParser } from './lineParser.js';
import { concat as concatBuffer } from './buffer.js';
import { Deferred } from './deferred.js';

class RequestSyntaxError extends Error {}

function parseRequestLine(line) {
  const [match, method, path, protocol] = /^(.+?) (.+?) (.+)$/.exec(line);

  if (!match) {
    throw new RequestSyntaxError(`Malformed request line: ${line}`);
  } else {
    return { method, path, protocol };
  }
}

function parseHeader(line) {
  const [match, key, value] = /^(.+?): (.+)$/.exec(line);

  if (!match) {
    throw new RequestSyntaxError(`Malformed header: ${line}`);
  } else {
    return { key, value };
  }
}

class HttpRequestParser {
  constructor({ onHttpRequest, onError }) {
    this.onHttpRequest = onHttpRequest;
    this.onError = onError;

    this.request = null;
    this.body = null;
    this.bodyDeferred = new Deferred();

    this.lineParser = new LineParser({
      onLine: (line) => {
        try {
          if (this.request) {
            if (line) {
              // Continue collecting headers
              this.request.headers.push(parseHeader(line));
            } else {
              const contentLengthHeader = this.request.headers.find(({ key }) => key === 'Content-Length');

              if (contentLengthHeader) {
                this.expectedContentLength = parseInt(contentLengthHeader.value);
              }

              this.body = new Uint8Array(0);
              this.addData(this.lineParser.buffer);
            }
          } else {
            this.request = {
              ...parseRequestLine(line),
              headers: [],
              getBody: () => this.bodyDeferred.promise
            };
          }
        } catch (error) {
          // @todo bad request
          this.onError && this.onError(error);
          this.bodyDeferred.reject(error);
        }
      }
    });
  }

  addData(data) {
    if (this.body) {
      // Collecting body
      this.body = concatBuffer(this.body, data);

      if (this.body.length === this.expectedContentLength) {
        this.bodyDeferred.resolve(this.body);
        this.onHttpRequest && this.onHttpRequest(this.request);
      }
    } else {
      // Collecting request line and headers
      this.lineParser.addData(data);
    }
  }

  end() {

  }
}

export { HttpRequestParser };
