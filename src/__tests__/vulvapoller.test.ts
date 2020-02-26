import { VulvaPoller } from "./../index";

const poller = new VulvaPoller(1000, 14342);

test("test", async () => {
  expect(poller).toBeInstanceOf(VulvaPoller);
});

poller.on("custom", () => {
  console.log("custom event.");
});

poller.send("s");

setTimeout(() => poller.close(), 5000);
