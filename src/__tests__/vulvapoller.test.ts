import { VulvaPoller, ISlot } from "./../index";
import { message, port, address } from "./variables/vulvapoller.test_variables";

const poller = new VulvaPoller(message, port, address);

poller.on("added", (products) => {
  console.log(new Date().toUTCString(), "added", products);
});

poller.on("removed", (products) => {
  console.log(new Date().toUTCString(), "removed", products);
});

poller.on("connect", () => {
  console.log(new Date().toUTCString(), "Connected.");
});

poller.on("listening", () => {
  console.log(new Date().toUTCString(), "Listening.");
});

poller.on("close", () => {
  console.log(new Date().toUTCString(), "Closed.");
});

poller.on("error", e => {
  console.log(new Date().toUTCString(), "Error.", e);
});

poller.on("message", s => {
  console.log(new Date().toUTCString(), "Message.", s);
});

poller.on("status", (slots: ISlot[]) => {
  console.log(new Date().toUTCString(), "status", slots.map(slot => { return `${slot.slot}: ${slot.name} (${slot.amount})${slot.status ? " [" + slot.status + "]" : ""}`}), "\n");
});

poller.startPolling(1000, 3);
setTimeout(() => poller.close(), 5000);
