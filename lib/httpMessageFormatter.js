function formatHeader({ key, value }) {
  return `${key}: ${value}`;
}

class HttpMessageFormatter {
  constructor({ onData, onEnd }) {
    this.onData = onData;
    this.onEnd = onEnd;
  }

  emitData(data) {
    this.onData && this.onData(data);
  }

  emitLine(line) {
    const utf8Encoder = new TextEncoder();
    this.emitData(utf8Encoder.encode(line + '\r\n'));
  }

  emitHeaders({ headers }) {
    headers.forEach((header) => this.emitLine(formatHeader(header)));
  }
}

export { HttpMessageFormatter };
