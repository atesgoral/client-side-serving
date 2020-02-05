import { Socket } from './lib/socket.js';
import { commonHeaderEncoderMiddleware, commonHeaderDecoderMiddleware } from './lib/middleware/commonHeaderMiddleware.js';
import { cookieEncoderMiddleware, cookieDecoderMiddleware } from './lib/middleware/cookieMiddleware.js';
import { sessionMiddleware } from './lib/middleware/sessionMiddleware.js';
import { bodyEncoderMiddleware, bodyDecoderMiddleware } from './lib/middleware/bodyMiddleware.js';
import { queryStringDecoderMiddleware } from './lib/middleware/queryStringMiddleware.js';
import { encodeParams as urlEncodeParams } from './lib/url.js';

import { LineParserStream } from './lib/lineParserStream.js';

const raw = new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode('Hello\r\nWorld!\r\nExtra'));
    controller.close();
  },
  pull(controller) {
    console.log('pull');
  },
  cancel() {
    console.log('cancel');
  }
});

const xform = new LineParserStream();

const lines = raw.pipeThrough(xform).getReader();

function readNextLine() {
  lines.read().then(({ done, value: line }) => {
    if (done) {
      console.log('EOF');
    } else {
      console.log('line:', line);
      readNextLine();
    }
  });
}

readNextLine();

// const clientSocket = new Socket();
// const serverSocket = new Socket();

// serverSocket.listen('foo');
// serverSocket.onReceive = (data) => {
//   console.log('Server received', data);
//   serverSocket.send('Pong');
// };

// clientSocket.connect('foo');
// clientSocket.onReceive = (data) => {
//   console.log('Client received', data);
// };

// clientSocket.connect('foo');
// clientSocket.send('Some data');

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
          commonHeaderDecoderMiddleware(this.request);

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
        console.error('Middleware error', error);
        // @TODO set internal server error
        break;
      }
    }
  }
}

// @todo rename to router middleware?
function applicationMiddleware(_, response) {
  response.body = 'Hello World!';
  response.headers['Content-Type'] = 'text/plain';
  response.headers['Content-Length'] = response.body.length;
  return false;
}

requestHandler.useMiddleware(cookieDecoderMiddleware);
requestHandler.useMiddleware(sessionMiddleware);
requestHandler.useMiddleware(bodyDecoderMiddleware);
requestHandler.useMiddleware(queryStringDecoderMiddleware);
requestHandler.useMiddleware(applicationMiddleware);

function encodeStatusLine({ protocol, statusCode, statusText }) {
  return `${protocol} ${statusCode} ${statusText}`;
}

function encodeResponse(response) {
  return [ encodeStatusLine(response) ]
    .concat(encodeHeaders(response))
    .concat(CRLF)
    .join(CRLF)
    .concat(encodeBody(response));
}

httpRequestReader.onRequest = async (request) => {
  console.log('Received request', request);

  const response = {
    protocol: 'HTTP/1.1',
    statusCode: 200,
    statusText: 'OK',
    headers: {}
  };

  await requestHandler.invokeMiddleware(request, response);

  console.log('Returning response', response);

  const encodedResponse = encodeResponse(response);

  console.log(JSON.stringify(encodedResponse));
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

const cookieJar = {
  cookies: [],
  setCookie(value, expiry) {
    this.cookies.push({ value, expiry });
  },
  cullExpiredCookies() {
    const now = new Date();
    this.cookies = this.cookies
      .filter((cookie) => !cookie.expiry || cookie.expiry > now);
  },
  getActiveCookies() {
    const now = new Date();
    return this.cookies
      .filter((cookie) => !cookie.expiry || cookie.expiry > now)
      .map((cookie) => cookie.value);
  }
};

cookieJar.setCookie('foo', new Date(Date.now() + 1000));

const queryString = urlEncodeParams({
  c: 3,
  d: 4
});

const request = {
  protocol: 'HTTP/1.1',
  method: 'POST',
  path: `/hello/world?${queryString}`,
  headers: {
    'User-Agent': 'Secret Agent 0.0.7'
  },
  cookies: cookieJar.getActiveCookies(),
  contentType: 'application/x-www-form-urlencoded',
  body: {
    a: 1,
    b: 2
  }
};

bodyEncoderMiddleware(request);
commonHeaderEncoderMiddleware(request);
cookieEncoderMiddleware(request);

const encodedRequest = encodeRequest(request);

socket.send(encodedRequest);
