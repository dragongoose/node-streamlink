import dgram from "dgram";
import { EventEmitter } from "events";

export interface IProduct {
  amount: number;
  name: string;
}

export interface ISlot {
  slot: number;
  amount: number;
  name: string;
  status?: VulvaStatus;
}

type VulvaStatus = "EMPTY" | "DISABLED" | "POSITIONERROR";

export declare interface VulvaPoller {
  on(event: 'connect'): this;
  on(event: 'close'): this;
  on(event: 'listening'): this;
  on(event: 'message', listening: (msg: string) => void): this;
  on(event: 'error', listening: (error: Error) => void): this;
  on(event: 'status', listening: (slots: ISlot[]) => void): this;
  on(event: 'added', listening: (products: IProduct[]) => void): this;
  on(event: 'removed', listening: (products: IProduct[]) => void): this;
}

export class VulvaPoller extends EventEmitter {
  private msg: string;
  private socket: dgram.Socket;
  private port: number;
  private address: string | undefined;
  private slots: ISlot[] = [];
  private open: boolean = false;

  public constructor(msg: string, port: number, address?: string) {
    super();
    this.msg = msg;
    this.port = port;
    this.address = address;
    this.socket = dgram.createSocket("udp4");

    this.socket.on("connect", () => {
      this.open = true;
      this.emit("connect");
    });
    this.socket.on("close", () => {
      this.open = false;
      this.emit("close");
    });
    this.socket.on("listening", () => this.emit("listening"));
    this.socket.on('error', (err) => {
      this.emit("error", err);
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

    this.socket.connect(this.port, this.address);
  }

  private handleNewStatus = (slots: ISlot[]) => {
    if (slots.length !== 8) {
      this.emit("error", new Error(`Vulva status has length ${slots.length} !== 8.`));
      return;
    }

    if (this.slots.length === 0) {
      this.slots = slots;
      this.emit("message", "Starting point set");
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
          amount: -change,
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

  public startPolling = (interval: number, times?: number) => {
    if (Number(times) <= 0) {
      return;
    }
    setTimeout(() => {
      if (this.open) {
        this.emit("message", `Polling${times ? ` (${times - 1} times left)` : ""}.`);
        this.socket.send(this.msg);
        this.startPolling(interval, times === undefined ? undefined : times - 1);
      } else {
        this.emit("error", "Cannot poll, becasue the socket is closed.");
      }
    }, interval);
  }

  public close = () => {
    this.socket.close();
  }
}
