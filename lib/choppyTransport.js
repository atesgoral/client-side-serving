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
