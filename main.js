import { Socket } from './lib/socket.js';
import { commonHeaderEncoderMiddleware, commonHeaderDecoderMiddleware } from './lib/middleware/commonHeaderMiddleware.js';
import { cookieEncoderMiddleware, cookieDecoderMiddleware } from './lib/middleware/cookieMiddleware.js';
import { sessionMiddleware } from './lib/middleware/sessionMiddleware.js';
import { bodyEncoderMiddleware, bodyDecoderMiddleware } from './lib/middleware/bodyMiddleware.js';
import { queryStringDecoderMiddleware } from './lib/middleware/queryStringMiddleware.js';
import { encodeParams as urlEncodeParams } from './lib/url.js';

import { HttpRequestParser } from './lib/httpRequestParser.js';
import { HttpRequestFormatter } from './lib/httpRequestFormatter.js';
import { HttpRequestParserStream } from './lib/httpRequestParserStream.js';
import { HttpResponseFormatter } from './lib/httpResponseFormatter.js';

const CRLF = '\r\n';

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

// const choppyTransport = {
//   queue: [],
//   timer: null,
//   sendChunk(chunk) {
//     this.queue.push(chunk);

//     if (this.timer === null) {
//       this.startTimer();
//     }
//   },
//   startTimer() {
//     this.timer = setTimeout(() => {
//       const chunk = this.queue.shift();
//       console.log('RX chunk', `(${chunk.length}) ${JSON.stringify(chunk)}`);
//       this.rx(chunk);

//       if (this.queue.length) {
//         this.startTimer();
//       } else {
//         this.timer = null;
//       }
//     }, Math.random() * 500);
//   },
//   tx(data) {
//     let remaining = data;
//     let chunkLength = 0;

//     do {
//       chunkLength = Math.round(Math.random() * (remaining.length - 1)) + 1;
//       this.sendChunk(remaining.substr(0, chunkLength));
//       remaining = remaining.substr(chunkLength);
//     } while (remaining.length);
//   }
// };

// choppyTransport.rx = (data) => httpRequestReader.write(data);

// const socket = {
//   send(data) {
//     choppyTransport.tx(data);
//   }
// };

// socket.send(encodedRequest);

// const raw = new ReadableStream({
//   start(controller) {
//     const encoder = new TextEncoder();
//     controller.enqueue(encoder.encode(encodedRequest));
//     controller.close();
//   },
//   pull(controller) {
//     console.log('pull');
//   },
//   cancel() {
//     console.log('cancel');
//   }
// });

const httpRequestParser = new HttpRequestParser();

httpRequestParser.onHttpRequest = async (request) => {
  console.log('Got request:', request);
  const body = await request.getBody();
  console.log('Got body:', body);

  const response = {
    protocol: 'HTTP/1.1',
    statusCode: 200,
    statusText: 'OK',
    headers: {}
  };

  await requestHandler.invokeMiddleware(request, response);

  console.log('Returning response', response);

  const httpResponseFormatter = new HttpResponseFormatter();

  httpResponseFormatter.onData = (data) => {
    const decoder = new TextDecoder();
    console.log(JSON.stringify(decoder.decode(data)));
  };

  httpResponseFormatter.onEnd = () => {
    console.log('--END--');
  };

  httpResponseFormatter.format(response);
};

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
  headers: [
    { key: 'User-Agent', value: 'Secret Agent 0.0.7' }
  ],
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

const httpRequestFormatter = new HttpRequestFormatter();

httpRequestFormatter.onData = (data) => httpRequestParser.addData(data);
httpRequestFormatter.onEnd = () => {
  console.log('Finished formatting request');
  // httpRequestParser.end();
};

httpRequestFormatter.format(request);

// const lines = raw.pipeThrough(xform).getReader();

// function readNextLine() {
//   lines.read().then(({ done, value: line }) => {
//     if (done) {
//       console.log('EOF');
//     } else {
//       console.log('line:', line);
//       readNextLine();
//     }
//   });
// }

// readNextLine();

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

