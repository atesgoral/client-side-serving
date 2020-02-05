import { concat } from './buffer.js';

const CR = 0x0d;
const LF = 0x0a;

class LineUnpacker {
  constructor() {
    this.buffer = new Uint8Array(0);
    this.onLine = null;
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

        this.onLine(line);
      } else if (octet === CR) {
        foundCr = true;
      }

      searchPos++;
    }
  }
}

export { LineUnpacker };
