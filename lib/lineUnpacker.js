class LineUnpacker {
  constructor() {
    this.data = new Uint8Array(0);
    this.onLine = null;
    this.onClose = null;
  }

  addBinaryData(uint8Array) {
    const newData = new Uint8Array(this.data.length + uint8Array.length);
    newData.set(this.data, 0);
    newData.set(uint8Array, this.data.length);
    this.data = newData;

    // this.checkForLines();
  }
}

export { LineUnpacker };
