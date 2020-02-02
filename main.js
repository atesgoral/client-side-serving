const CRLF = '\r\n';

const lineReader = {
  buffer: '',
  write(data) {
    let combined = this.buffer + data;

    do {
      const idx = combined.indexOf(CRLF);

      if (idx === -1) {
        this.buffer = combined;
        return;
      }

      this.onLine(combined.substr(0, idx));
      combined = combined.substr(idx + CRLF.length);
    } while (combined.length);
  }
};

const bodyDecoders = {
  'application/x-www-form-urlencoded': {
    decode(body) {
      return body;
    }
  }
}

const httpRequestReader = {
  state: 'RECEIVE_REQUEST_LINE',
  request: null,
  write(data) {
    switch (this.state) {
      case 'RECEIVE_REQUEST_LINE':
      case 'RECEIVE_HEADERS':
        lineReader.write(data);
        break;
      case 'RECEIVE_BODY':
        this.request.body += data;

        console.log(this.request.body.length, this.request.body);
        if (this.request.body.length === this.request.contentLength) {
          this.state = 'END';
          console.log(this.request);
        }
        break;
    }
  },
  onLine(line) {
    switch (this.state) {
      case 'RECEIVE_REQUEST_LINE':
        this.parseRequestLine(line);
        this.state = 'RECEIVE_HEADERS';
        break;
      case 'RECEIVE_HEADERS':
        if (line !== '') {
          this.parseHeader(line);
        } else {
          this.request.contentLength = parseInt(this.request.headers['Content-Length']);
          this.request.contentType = this.request.headers['Content-Type'];
          this.state = 'RECEIVE_BODY';
          this.onRequest(this.request);
        }
        break;
    }
  },
  parseRequestLine(line) {
    const [match, method, path, protocol] = /^(.+?) (.+?) (.+)$/.exec(line);

    if (!match) {
      console.error('Malformed request line');
      this.state = 'BAD_REQUEST';
    } else {
      this.request = { method, path, protocol, headers: {}, body: '' };
    }
  },
  parseHeader(line) {
    const [match, key, value] = /^(.+?): (.+)$/.exec(line);

    if (!match) {
      console.error('Malformed header');
      this.state = 'BAD_REQUEST';
    } else {
      this.request.headers[key] = value;
    }
  },
};

lineReader.onLine = (line) => httpRequestReader.onLine(line);

httpRequestReader.onRequest = (request) => {
  console.log('Received request', request);
}

const choppyTransport = {
  queue: [],
  timer: null,
  sendChunk(chunk) {
    if (this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.rx(chunk);
        if (this.queue.length) {
          this.sendChunk(this.queue.shift());
        }
      }, Math.random() * 250);
    } else {
      this.queue.push(chunk);
    }
  },
  tx(data) {
    let remaining = data;
    let chunkLength = 0;

    do {
      chunkLength = Math.round(Math.random() * remaining.length);
      this.sendChunk(remaining.substr(0, chunkLength));
      remaining = remaining.substr(chunkLength);
    } while (remaining.length);
  }
};

choppyTransport.rx = (data) => httpRequestReader.write(data);

const socket = {
  send(data) {
    choppyTransport.tx(data);
  }
};

function encodeRequestLine({ protocol, method, path }) {
  return `${method} ${path} ${protocol}`;
}

function encodeHeader([ key, value ]) {
  return `${key}: ${value}`;
}

function encodeHeaders({ headers }) {
  return Object.entries(headers).map(encodeHeader);
}

function encodeBody({ body }) {
  return typeof body !== 'undefined' ? body : '';
}

function encodeRequest(request) {
  return [ encodeRequestLine(request) ]
    .concat(encodeHeaders(request))
    .concat(CRLF)
    .join(CRLF)
    .concat(encodeBody(request));
}

const bodyEncoders = {
  'text/plain': {
    encode(body) {
      return String(body);
    }
  },
  'application/x-www-form-urlencoded': {
    encode(body) {
      return Object.entries(body)
        .map(([ key, value ]) => {
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');
    }
  },
  'application/json': {
    encode(body) {
      return JSON.stringify(body);
    }
  }
};

const form = {
  a: 1,
  b: 2
};
const contentType = 'application/x-www-form-urlencoded';
const body = bodyEncoders['application/x-www-form-urlencoded'].encode(form);

const request = {
  protocol: 'HTTP/1.1',
  method: 'POST',
  path: '/hello',
  headers: {
    'User-Agent': 'Secret Agent 0.0.7',
    'Content-Type': contentType,
    'Content-Length': body.length
  },
  body
};

const encodedRequest = encodeRequest(request);

socket.send(encodedRequest);
