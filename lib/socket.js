const channels = {};

class Socket {
  onReceive() {}
  registerMessageHandler() {
    this.port.onmessage = (event) => {
      this.onReceive(event.data);
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
