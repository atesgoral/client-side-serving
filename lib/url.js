function encodeParams(params) {
  return Object.entries(params)
    .map(([ key, value ]) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}

function decodeParams(encoded) {
  return Object.fromEntries(
    encoded
      .split('&')
      .map((kvPair) => kvPair.split('=').map(decodeURIComponent))
  );
}

export { encodeParams, decodeParams };
