import { LineUnpacker } from './lineUnpacker.js';

class LineTransformStream {
  constructor() {
    const unpacker = new LineUnpacker();

    this.readable = new ReadableStream({
      start(controller) {
        unpacker.onLine = (line) => controller.enqueue(line);
        // unpacker.onClose = () => controller.close();
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
