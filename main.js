function send(data) {

}

function chunkedSend(data) {
  send(data);
}

function encodeRequestLine({ protocol, method, path }) {
  return `${method} ${path} ${protocol}`;
}

function encodeHeader([ key, value ]) {
  return `${key}: ${value}`;
}

function encodeHeaders({ headers }) {
  return Object.entries(headers).map(encodeHeader);
}

function encodeRequest(request) {
  return [ encodeRequestLine(request) ]
    .concat(encodeHeaders(request))
    .concat('\r\n')
    .join('\r\n')
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

const data = {
  a: 1,
  b: 2
};
const contentType = 'application/x-www-form-urlencoded';
const body = bodyEncoders['application/x-www-form-urlencoded'].encode(data);

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

chunkedSend(encodedRequest);
