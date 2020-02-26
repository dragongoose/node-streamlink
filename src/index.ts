import dgram from "dgram";
import { EventEmitter } from "events";

export interface ISlot {
  slot: number;
  amount: number;
  name: string;
  status?: VulvaStatus;
}

type VulvaStatus = "EMPTY" | "DISABLED" | "POSITIONERROR";

export interface IProduct {
  amount: number;
  name: string;
}

export class VulvaPoller extends EventEmitter {
  private interval: number;
  private socket: dgram.Socket;
  private slots: Map<string, number> = new Map<string, number>();

  public constructor(interval: number, port: number, address?: string) {
    super();
    this.interval = interval;
    this.interval;
    this.socket = dgram.createSocket("udp4");

    this.socket.on("connect", () => console.log("Connected."));
    this.socket.on("listening", () => console.log("Listening."));
    this.socket.on("close", () => console.log("Close."));
    this.socket.on('error', (err) => {
      console.log(`this. error:\n${err.stack}`);
      this.socket.close();
    });

    // The only message should be the current status
    this.socket.on('message', msg => {
      const a: ISlot[] = msg.toString().split("\n").slice(0, -1).map((s, i) => ({
          slot: i,
          name: s.slice(6).split("(").reverse()[1].trim(),
          amount: Number(s.split("(").reverse()[0].split(")")[0]),
          status: s.split("\t")[1] as VulvaStatus,
      }));

      this.emit("status", a);
      this.handleNewStatus(a);
    });

    this.socket.connect(port, address);
  }

  private handleNewStatus = (slots: ISlot[]) => {
    if (slots.length !== 8) {
      this.emit("error", `Vulva status has length ${slots.length} !== 8.`)
      return;
    }

    const map = new Map<string, number>();
    const added: IProduct[] = [];
    const removed: IProduct[] = [];

    slots.forEach(s => {
      map.set(s.name, map.get(s.name) || 0 + s.amount);
    });

    if (this.slots.size === 0) {
      this.slots = map;
      console.log(new Date().toUTCString(), "Starting point set.", map);
      return;
    }

    map.forEach((newAmount, name) => {
      const oldAmount = this.slots.get(name) || 0;
      if (newAmount > oldAmount) {
        added.push({
          name,
          amount: newAmount - oldAmount,
        });
      } else if (oldAmount > newAmount) {
        removed.push({
          name,
          amount: oldAmount - newAmount,
        });
      }
    });

    if (added.length > 0) {
      this.emit("added", added);
    }
    if (removed.length > 0) {
      this.emit("removed", removed);
    }

    this.slots = map;
  }

  public send = (msg: string) => {
    this.socket.send(msg);
  }

  public close = () => {
    this.socket.close();
  }

}

const poller = new VulvaPoller(1000, 14243, "82.130.59.165");

poller.on("added", (products: IProduct[]) => {
  console.log(new Date().toUTCString(), "added", products);
});

poller.on("removed", (products: IProduct[]) => {
  console.log(new Date().toUTCString(), "removed", products);
});

// poller.on("status", (slots: ISlot[]) => {
//   console.log(new Date().toUTCString(), "status", slots.map(slot => { return `${slot.slot}: ${slot.name} (${slot.amount})${slot.status ? " [" + slot.status + "]" : ""}`}), "\n");
// });

const poll = () => {
  poller.send("s");
  setTimeout(() => poll(), 5000);
}

setTimeout(() => poll(), 1000);
