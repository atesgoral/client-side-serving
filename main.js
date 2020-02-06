import { Socket } from './lib/socket.js';
import { commonHeaderEncoderMiddleware, commonHeaderDecoderMiddleware } from './lib/middleware/commonHeaderMiddleware.js';
import { cookieEncoderMiddleware, cookieDecoderMiddleware } from './lib/middleware/cookieMiddleware.js';
import { sessionMiddleware } from './lib/middleware/sessionMiddleware.js';
import { bodyEncoderMiddleware, bodyDecoderMiddleware } from './lib/middleware/bodyMiddleware.js';
import { queryStringDecoderMiddleware } from './lib/middleware/queryStringMiddleware.js';
import { encodeParams as urlEncodeParams } from './lib/url.js';

import { HttpRequestParser } from './lib/httpRequestParser.js';
import { HttpResponseParser } from './lib/httpResponseParser.js';
import { HttpRequestFormatter } from './lib/httpRequestFormatter.js';
//import { HttpRequestParserStream } from './lib/httpRequestParserStream.js';
import { HttpResponseFormatter } from './lib/httpResponseFormatter.js';

import { CookieJar } from './lib/cookieJar.js';

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
  response.contentType = 'text/plain';
  return false;
}

requestHandler.useMiddleware(commonHeaderDecoderMiddleware);
requestHandler.useMiddleware(cookieDecoderMiddleware);
requestHandler.useMiddleware(sessionMiddleware);
// requestHandler.useMiddleware(bodyDecoderMiddleware);
requestHandler.useMiddleware(queryStringDecoderMiddleware);
requestHandler.useMiddleware(applicationMiddleware);

const httpRequestParser = new HttpRequestParser({
  async onHttpRequest(request) {
    console.log('Got request:', request);
    console.log('Body:', await request.getBody());

    const response = {
      protocol: 'HTTP/1.1',
      statusCode: 200,
      statusText: 'OK',
      headers: [
        { key: 'Server', value: 'Chippewa/0.0.0' }
      ]
    };

    await requestHandler.invokeMiddleware(request, response);

    console.log('Returning response:', response);

    bodyEncoderMiddleware(response);
    commonHeaderEncoderMiddleware(response);

    const httpResponseParser = new HttpResponseParser({
      async onHttpResponse(response) {
        console.log('Got response:', response);
        console.log('Body:', await response.getBody());
      },
      onError(error) {

      }
    })

    const httpResponseFormatter = new HttpResponseFormatter({
      onData(data) {
        httpResponseParser.addData(data);
      },
      onEnd() {
      }
    });

    httpResponseFormatter.format(response);
  }
});

const cookieJar = new CookieJar();
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
    { key: 'User-Agent', value: 'Secret Agent/0.0.7' }
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

const httpRequestFormatter = new HttpRequestFormatter({
  onData(data) {
     httpRequestParser.addData(data);
  },
  onEnd() {
    // httpRequestParser.end();
  }
});

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

// const clientSocket = new Socket({
//   onReceive(data) {
//     console.log('Client received', data);
//   }
// });

// const serverSocket = new Socket({
//   onReceive(data) {
//     console.log('Server received', data);
//     serverSocket.send('Pong');
//   }
// });

// serverSocket.listen('foo');
// clientSocket.connect('foo');
// clientSocket.send('Some data');

