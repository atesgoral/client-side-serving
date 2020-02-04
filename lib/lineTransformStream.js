import { LineUnpacker } from './lineUnpacker.js';

class LineTransformStream {
  constructor() {
    this.readable = new ReadableStream({
      start(controller) {
        unpacker.onLine = chunk => controller.enqueue(chunk);
        unpacker.onClose = () => controller.close();
      }
    });

    this.writable = new WritableStream({
      write(uint8Array) {
        unpacker.addBinaryData(uint8Array);
      }
    });
  }
}

export { LineTransformStream };
