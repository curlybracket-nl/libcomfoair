import { Bridge } from "./bridge.js"
import { BridgeDetails } from "./discoveryOperation.js"
import { Logger, ConsolePrinter, LogLevel } from "./util/logging";

Logger.getRoot().addPrinter(new ConsolePrinter()).setLogLevel(LogLevel.ALL).setName('comfo-connect');

(async () => {
  console.log('Hello World')
  Bridge.discover({ limit: 1 }).on('discover', (bridge: BridgeDetails) => {
    console.log(`DISCOVERED: ${bridge.address} ${bridge.version} ${bridge.uuid}`)
  }).then((bridges) => {
    console.log(bridges)
  })
})();