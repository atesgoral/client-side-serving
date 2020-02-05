import { LineParser } from './lineParser.js';

class LineParserStream {
  constructor() {
    const parser = new LineParser();

    this.readable = new ReadableStream({
      start(controller) {
        parser.onLine = (line) => controller.enqueue(line);
        // parser.onClose = () => controller.close();
      }
    });

    this.writable = new WritableStream({
      write(data) {
        console.log('data:', data);
        parser.addData(data);
      },
      close() {
        console.log('lts close');
        console.log(parser.buffer);
      }
    });
  }
}

export { LineParserStream };
