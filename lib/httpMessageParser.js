import { LineParser } from './lineParser.js';
import { concat as concatBuffer } from './buffer.js';
import { Deferred } from './deferred.js';

class HeaderSyntaxError extends Error {}

function parseHeader(line) {
  const [match, key, value] = /^(.+?): (.+)$/.exec(line);

  if (!match) {
    throw new HeaderSyntaxError(`Malformed header: ${line}`);
  } else {
    return { key, value };
  }
}

class HttpMessageParser {
  constructor({ onHttpMessage, onError }) {
    this.onHttpMessage = onHttpMessage;
    this.onError = onError;

    this.message = null;
    this.body = null;
    this.bodyDeferred = new Deferred();

    this.lineParser = new LineParser({
      onLine: (line) => {
        try {
          if (this.message) {
            if (line) {
              // Continue collecting headers
              this.message.headers.push(parseHeader(line));
            } else {
              const contentLengthHeader = this.message.headers.find(({ key }) => key === 'Content-Length');

              if (contentLengthHeader) {
                this.expectedContentLength = parseInt(contentLengthHeader.value);
              }

              this.body = new Uint8Array(0);
              this.addData(this.lineParser.buffer);
            }
          } else {
            this.message = {
              ...this.parseFirstLine(line),
              headers: [],
              getBody: () => this.bodyDeferred.promise
            };
          }
        } catch (error) {
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
        this.onHttpMessage && this.onHttpMessage(this.message);
      }
    } else {
      // Collecting first line and headers
      this.lineParser.addData(data);
    }
  }

  end() {

  }
}

export { HttpMessageParser, HeaderSyntaxError };
