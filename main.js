const CRLF = '\r\n';

const lineReader = {
  buffer: '',
  write(chunk) {
    this.buffer += chunk;

    do {
      const idx = this.buffer.indexOf(CRLF);

      if (idx === -1) {
        return;
      }

      const line = this.buffer.substr(0, idx);
      this.buffer = this.buffer.substr(idx + CRLF.length);
      this.onLine(line);
    } while (this.buffer.length);
  }
};

const httpRequestReader = {
  state: 'RECEIVE_REQUEST_LINE',
  request: null,
  write(chunk) {
    switch (this.state) {
      case 'RECEIVE_REQUEST_LINE':
      case 'RECEIVE_HEADERS':
        lineReader.write(chunk);
        break;
      case 'RECEIVE_BODY':
        this.addBodyChunk(chunk)
        break;
    }
  },
  onLine(line) {
    switch (this.state) {
      case 'RECEIVE_REQUEST_LINE':
        this.parseRequestLine(line);
        this.request.headers = {};
        this.state = 'RECEIVE_HEADERS';
        break;
      case 'RECEIVE_HEADERS':
        if (line !== '') {
          this.parseHeader(line);
        } else {
          this.request.contentLength = parseInt(this.request.headers['Content-Length']);
          this.request.contentType = this.request.headers['Content-Type'];

          if (this.request.contentLength) {
            this.state = 'RECEIVE_BODY';
            this.request.body = '';
            this.addBodyChunk(lineReader.buffer);
          } else {
            this.end();
          }
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
      this.request = { method, path, protocol };
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
  addBodyChunk(chunk) {
    this.request.body += chunk;

    if (this.request.body.length === this.request.contentLength) {
      this.end();
    }
  },
  end() {
    this.state = 'END';
    this.onRequest(this.request);
  }
};

lineReader.onLine = (line) => httpRequestReader.onLine(line);

const bodyDecoders = {
  'text/plain': {
    decode(body) {
      return body;
    }
  },
  'application/x-www-form-urlencoded': {
    decode(body) {
      return Object.fromEntries(
        body
          .split('&')
          .map((kvPair) => kvPair.split('=').map(decodeURIComponent))
      );
    }
  },
  'application/json': {
    decode(body) {
      return JSON.parse(body);
    }
  }
}

async function bodyDecoderMiddleware(request) {
  const bodyDecoder = bodyDecoders[request.contentType];

  if (bodyDecoder) {
    request.body = bodyDecoder.decode(request.body);
  }
}

async function queryStringParserMiddleware(request) {
  // @TODO
}

const requestHandler = {
  firstMiddlewareNode: null,
  lastMiddlewareNode: null,
  useMiddleware(middleware) {
    const middlewareNode = { middleware };

    if (this.lastMiddlewareNode) {
      this.lastMiddlewareNode.next = middlewareNode;
    } else {
      this.firstMiddlewareNode = middlewareNode;
    }

    this.lastMiddlewareNode = middlewareNode;
  },
  async invokeMiddleware(request, response) {
    let middlewareNode = this.firstMiddlewareNode;

    let propagate = true;

    while (middlewareNode && propagate) {
      try {
        propagate = await middlewareNode.middleware(request, response);

        if (propagate) {
          middlewareNode = middlewareNode.next;
        }
      } catch (error) {
        break;
      }
    }
  }
}

requestHandler.useMiddleware(bodyDecoderMiddleware);

httpRequestReader.onRequest = async (request) => {
  console.log('Received request', request);

  const response = { statusCode: 200, statusText: 'OK' };

  await requestHandler.invokeMiddleware(request, response);

  console.log('Returning response', response);

  return response;
}

const choppyTransport = {
  queue: [],
  timer: null,
  sendChunk(chunk) {
    this.queue.push(chunk);

    if (this.timer === null) {
      this.startTimer();
    }
  },
  startTimer() {
    this.timer = setTimeout(() => {
      const chunk = this.queue.shift();
      console.log('RX chunk', `(${chunk.length}) ${JSON.stringify(chunk)}`);
      this.rx(chunk);

      if (this.queue.length) {
        this.startTimer();
      } else {
        this.timer = null;
      }
    }, Math.random() * 500);
  },
  tx(data) {
    let remaining = data;
    let chunkLength = 0;

    do {
      chunkLength = Math.round(Math.random() * (remaining.length - 1)) + 1;
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
      return body;
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
