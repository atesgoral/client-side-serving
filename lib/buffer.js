function concat(a, b) {
  const buffer = new Uint8Array(a.length + b.length);

  buffer.set(a, 0);
  buffer.set(b, a.length);

  return buffer;
}

export { concat };
