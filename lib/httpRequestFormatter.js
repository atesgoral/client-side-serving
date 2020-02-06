function formatRequestLine({ protocol, method, path }) {
  return `${method} ${path} ${protocol}`;
}

function formatHeader({ key, value }) {
  return `${key}: ${value}`;
}

// @todo HttpMessageFormatter?

class HttpRequestFormatter {
  constructor() {
    this.onData = null;
    this.onEnd = null;
  }

  emitData(data) {
    this.onData && this.onData(data);
  }

  emitLine(line) {
    const utf8Encoder = new TextEncoder();
    this.emitData(utf8Encoder.encode(line + '\r\n'));
  }

  format(request) {
    this.emitLine(formatRequestLine(request));

    request.headers.forEach((header) => {
      this.emitLine(formatHeader(header));
    });

    this.emitLine('');

    request.body && this.emitData(request.body);

    this.onEnd && this.onEnd();
  }
}

export { HttpRequestFormatter };
