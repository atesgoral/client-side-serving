function formatStatusLine({ protocol, statusCode, statusText }) {
  return `${protocol} ${statusCode} ${statusText}`;
}

function formatHeader({ key, value }) {
  return `${key}: ${value}`;
}

class HttpResponseFormatter {
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

  format(response) {
    this.emitLine(formatStatusLine(response));

    response.headers.forEach((header) => {
      this.emitLine(formatHeader(header));
    });

    this.emitLine('');

    response.body && this.emitData(response.body);

    this.onEnd && this.onEnd();
  }
}

export { HttpResponseFormatter };
