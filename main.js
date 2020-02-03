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

function urlDecodeParams(encoded) {
  return Object.fromEntries(
    encoded
      .split('&')
      .map((kvPair) => kvPair.split('=').map(decodeURIComponent))
  );
}

const bodyDecoders = {
  'text/plain': {
    decode(body) {
      return body;
    }
  },
  'application/x-www-form-urlencoded': {
    decode: urlDecodeParams
  },
  'application/json': {
    decode: JSON.parse
  }
}

function decodeCookies(encoded) {
  return encoded && encoded.split('; ');
}

async function cookieMiddleware(request) {
  const cookies = decodeCookies(request.headers['Cookie']);
  request.cookies = cookies;
  return true;
}

const SESSION_COOKIE_NAME = '__SESSION';
const SESSION_COOKIE_REGEX = new RegExp(`^${SESSION_COOKIE_NAME}=(.+)$`);
const SESSION_ID_BITS = 31;
const SESSION_ID_MIN = 2 ** (SESSION_ID_BITS - 1);
const SESSION_ID_MAX = 2 ** SESSION_ID_BITS;

const sessionDataMap = {};

function getSessionId(request) {
  const sessionCookie = request.cookies && request.cookies.find((cookie) => SESSION_COOKIE_REGEX.test(cookie));

  if (sessionCookie) {
    let [ _, sessionId ] = SESSION_COOKIE_REGEX.exec(sessionCookie);
    return sessionId;
  }
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min | 0;
}

function setNewSessionId(response) {
  let sessionId = null;

  do {
    sessionId = `${randomRange(SESSION_ID_MIN, SESSION_ID_MAX).toString(16)}`;
  } while (sessionDataMap[sessionId]);

  response.headers['Set-Cookie'] = `${SESSION_COOKIE_NAME}=${sessionId}`;

  return sessionId;
}

async function sessionMiddleware(request, response) {
  const sessionId = getSessionId(request) || setNewSessionId(response);
  const sessionData = sessionDataMap[sessionId] || (sessionDataMap[sessionId] = {});

  request.session = sessionData;

  return true;
}

async function bodyDecoderMiddleware(request) {
  const bodyDecoder = bodyDecoders[request.contentType];

  if (bodyDecoder) {
    request.body = bodyDecoder.decode(request.body);
  }

  return true;
}

async function queryStringParserMiddleware(request) {
  const [match, queryString] = /^.+?\?(.+)$/.exec(request.path);

  if (match) {
    request.queryParams = urlDecodeParams(queryString);
  }

  return true;
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
        console.error('Middleware error', error);
        // @TODO set internal server error
        break;
      }
    }
  }
}

function applicationMiddleware(_, response) {
  response.body = 'Hello World!';
  response.headers['Content-Type'] = 'text/plain';
  response.headers['Content-Length'] = response.body.length;
  return false;
}

requestHandler.useMiddleware(cookieMiddleware);
requestHandler.useMiddleware(sessionMiddleware);
requestHandler.useMiddleware(bodyDecoderMiddleware);
requestHandler.useMiddleware(queryStringParserMiddleware);
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

function urlEncodeParams(params) {
  return Object.entries(params)
    .map(([ key, value ]) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}

const bodyEncoders = {
  'text/plain': {
    encode(body) {
      return body;
    }
  },
  'application/x-www-form-urlencoded': {
    encode: urlEncodeParams
  },
  'application/json': {
    encode: JSON.stringify
  }
};

const contentType = 'application/x-www-form-urlencoded';
const body = bodyEncoders['application/x-www-form-urlencoded'].encode({
  a: 1,
  b: 2
});
const queryString = urlEncodeParams({
  c: 3,
  d: 4
});

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

function encodeCookies(cookies) {
  return cookies.join('; ');
}

cookieJar.setCookie('foo', new Date(Date.now() + 1000));

const cookies = encodeCookies(cookieJar.getActiveCookies());

const request = {
  protocol: 'HTTP/1.1',
  method: 'POST',
  path: `/hello/world?${queryString}`,
  headers: {
    'User-Agent': 'Secret Agent 0.0.7',
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Cookie': cookies
  },
  body
};

const encodedRequest = encodeRequest(request);

socket.send(encodedRequest);
