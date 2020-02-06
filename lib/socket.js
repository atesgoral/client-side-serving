const channels = {};

class Socket {
  constructor({ onReceive }) {
    this.onReceive = onReceive;
  }

  registerMessageHandler() {
    this.port.onmessage = (event) => {
      this.onReceive && this.onReceive(event.data);
    };
  }

  connect(address, onMessage) {
    const channel = channels[address];
    this.port = channel.port2;
    this.registerMessageHandler();
  }

  listen(address, onMessage) {
    const channel = channels[address] = new MessageChannel();
    this.port = channel.port1;
    this.registerMessageHandler();
  }

  send(data) {
    this.port.postMessage(data);
  }
}

export { Socket };
