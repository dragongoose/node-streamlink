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
  private slots: ISlot[] = [];

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

    if (this.slots.length === 0) {
      this.slots = slots;
      console.log(new Date().toUTCString(), "Starting point set.", this.slots);
      return;
    }

    const added: IProduct[] = [];
    const removed: IProduct[] = [];

    slots.forEach((slot, i) => {
      if (slot.name !== this.slots[i].name) {
        if (slot.amount > 0) {
          added.push({
            name: slot.name,
            amount: slot.amount,
          });
        }

        if (this.slots[i].amount > 0) {
          removed.push({
            name: this.slots[i].name,
            amount: this.slots[i].amount,
          });
        }
        return;
      }

      const change = slot.amount - this.slots[i].amount;
      if (change > 0) {
        added.push({
          name: slot.name,
          amount: change,
        });
      } else if (change < 0) {
        removed.push({
          name: slot.name,
          amount: change,
        });
      }
    });

    if (added.length > 0) {
      this.emit("added", added);
    }
    if (removed.length > 0) {
      this.emit("removed", removed);
    }

    this.slots = slots;
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
