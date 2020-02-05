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
      write(data) {
        console.log('data:', data);
        unpacker.addData(data);
      },
      close() {
        console.log('lts close');
        console.log(unpacker.buffer);
      }
    });
  }
}

export { LineTransformStream };
