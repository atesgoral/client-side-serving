import { concat } from './buffer.js';

const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);

class LineParser {
  constructor({ onLine }) {
    this.onLine = onLine;
    this.buffer = new Uint8Array(0);
  }

  addData(data) {
    let searchPos = this.buffer.length;
    let foundCr = searchPos && this.buffer[searchPos - 1] === CR;
    let octet = null;

    this.buffer = concat(this.buffer, data);

    while (searchPos < this.buffer.length) {
      octet = this.buffer[searchPos];

      if (foundCr && octet === LF) {
        const utf8decoder = new TextDecoder();
        const line = utf8decoder.decode(this.buffer.subarray(0, searchPos - 1));

        this.buffer = this.buffer.slice(searchPos + 1);

        this.onLine && this.onLine(line);
        searchPos = 0;
        foundCr = false;
        continue;
      } else if (octet === CR) {
        foundCr = true;
      }

      searchPos++;
    }
  }
}

export { LineParser };
