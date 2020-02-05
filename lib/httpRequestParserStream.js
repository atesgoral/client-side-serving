import { HttpRequestParser } from './httpRequestParser.js';

class HttpRequestParserStream {
  constructor() {
    const parser = new HttpRequestParser();

    this.readable = new ReadableStream({
      start(controller) {
        parser.onHttpRequest = (httpRequest) => controller.enqueue(httpRequest);
      }
    });

    this.writable = new WritableStream({
      write(data) {
        console.log('HttpRequestParserStream write', data);
        parser.addData(data);
      },
      close() {
        console.log('HttpRequestParserStream close');
      }
    });
  }
}

export { HttpRequestParserStream };
