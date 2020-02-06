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

  response.headers.push({ key: 'Set-Cookie', value: `${SESSION_COOKIE_NAME}=${sessionId}` });

  return sessionId;
}

async function sessionMiddleware(request, response) {
  const sessionId = getSessionId(request) || setNewSessionId(response);
  const sessionData = sessionDataMap[sessionId] || (sessionDataMap[sessionId] = {});

  request.session = sessionData;

  return true;
}

export { sessionMiddleware };
