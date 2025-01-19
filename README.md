# libcomfoair 🌬️

This library is 100% TypeScript-based, written from scratch, and strongly typed, making it easier to develop reliable and maintainable applications.

`libcomfoair` is a TypeScript library for interacting with Zehnder ComfoAirQ ventilation units via the Zehnder ComfoConnect LAN C gateway (sometimes also referred to as ComfoControl). It allows you to discover these gateways on your network, read and write properties, and listen for property changes on ComfoAirQ units.

## Features ✨

- 🔍 Discover Zehnder ComfoConnect LAN C gateways on the same network.
- 📖 Read and write properties of Zehnder ComfoAirQ devices.
- 🔄 Listen for property changes on ComfoAirQ units.
- ⚙️ TypeScript-based, ensuring reliable development using strong types.

## Installation 📦

```bash
npm install libcomfoair
```

## Usage 🚀

### Discovering Devices 🔍

To discover Zehnder ComfoConnect LAN C gateways on your network, use the `discoveryOperation` function. Note that the gateway must be on the same network as the device performing the discovery. The discovery operation can be awaited and also emits events.

```typescript
import { ComfoControlClient } from 'libcomfoair';

// Awaiting discovery using a promise
// When a limit is set the discovery stops once the limit is reached
// Otherwise it continues for the set timeout 
ComfoControlClient.discover({ limit: 1 }).then(devices => {
  console.log('Discovered devices:', devices);
  if (devices.length > 0) {
    const client = new ComfoControlClient(devices[0]);
    // For example, retrieve server time 
    client.getServerTime().then(time => {
      console.log(`Got server time: ${time}`);
    });
  }
});

// Listening to discovery events
const discovery = ComfoControlClient.discover({ limit: 1 });
discovery.on('discover', device => {
  console.log('Discovered device:', device);
});
discovery.on('completed', () => {
  console.log('Discovery finished');
});
```

### Listening for Property Changes 🔄

You can listen for property changes on a ComfoAirQ unit by registering property listeners. Make sure you connect the client first:

```typescript
import { ComfoControlClient, ComfoAirProperties } from 'libcomfoair';
import { ComfoControlServerInfo } from 'libcomfoair'; // Example import

async function main() {
  const serverInfo: ComfoControlServerInfo = {
    ip: 'device-ip-address',
    port: 80,
    // ...other fields...
  };

  const client = new ComfoControlClient(serverInfo);

  // Register a listener for OUTDOOR_AIR_TEMPERATURE
  await client.registerPropertyListener(ComfoAirProperties.OUTDOOR_AIR_TEMPERATURE, ({ value }) => {
    console.log(`Outdoor air temperature: ${value / 10} °C`);
  });

  // Register a listener for SUPPLY_AIR_TEMPERATURE
  await client.registerPropertyListener(ComfoAirProperties.SUPPLY_AIR_TEMPERATURE, ({ value }) => {
    console.log(`Supply air temperature: ${value / 10} °C`);
  });

  // Finally connect the client
  // This will start a session and begin receiving property updates
  await client.getServerTime(); // Example request
}
```

## How Device Discovery Works 🕵️‍♂️

The discovery of Zehnder ComfoConnect LAN C gateways works by sending a broadcast message on the network and waiting for responses. For the discovery to work, the gateway must be on the same network as the device performing the discovery.

## Available Opcodes

Below is a list of all ComfoControl opcodes supported by this library:

| Opcode                        | Description                                            |
|-------------------------------|--------------------------------------------------------|
| NO_OPERATION                  | No operation (placeholder).                            |
| SET_ADDRESS_REQUEST           | Sets the device address.                              |
| REGISTER_DEVICE_REQUEST       | Registers a device/client.                            |
| START_SESSION_REQUEST         | Initiates a session.                                  |
| CLOSE_SESSION_REQUEST         | Ends an existing session.                             |
| LIST_REGISTERED_APPS_REQUEST  | Lists registered apps/clients.                        |
| UNREGISTER_DEVICE_REQUEST     | Unregisters a device/client.                          |
| CHANGE_PIN_REQUEST            | Changes the device PIN code.                          |
| GET_REMOTE_ACCESS_ID_REQUEST  | Retrieves the remote access ID.                       |
| SET_REMOTE_ACCESS_ID_REQUEST  | Sets the remote access ID.                            |
| GET_SUPPORT_ID_REQUEST        | Retrieves the support ID.                             |
| SET_SUPPORT_ID_REQUEST        | Sets the support ID.                                  |
| GET_WEB_ID_REQUEST            | Retrieves the web ID.                                 |
| SET_WEB_ID_REQUEST            | Sets the web ID.                                      |
| SET_PUSH_ID_REQUEST           | Sets the push notification ID.                        |
| DEBUG_REQUEST                 | Debug request.                                        |
| UPGRADE_REQUEST               | Initiates firmware upgrade.                           |
| SET_DEVICE_SETTINGS_REQUEST   | Adjusts device settings.                              |
| VERSION_REQUEST               | Queries version information.                          |
| SET_ADDRESS_CONFIRM           | Confirms address setup.                               |
| REGISTER_DEVICE_CONFIRM       | Acknowledges registration.                            |
| START_SESSION_CONFIRM         | Confirms session initiation.                          |
| CLOSE_SESSION_CONFIRM         | Confirms session closure.                             |
| LIST_REGISTERED_APPS_CONFIRM  | Confirms list of registered apps.                     |
| UNREGISTER_DEVICE_CONFIRM     | Confirms device unregistration.                       |
| CHANGE_PIN_CONFIRM            | Confirms PIN change.                                  |
| GET_REMOTE_ACCESS_ID_CONFIRM  | Remote access ID confirmation.                        |
| SET_REMOTE_ACCESS_ID_CONFIRM  | Remote access ID setup confirmed.                     |
| GET_SUPPORT_ID_CONFIRM        | Support ID confirmation.                              |
| SET_SUPPORT_ID_CONFIRM        | Support ID setup confirmed.                           |
| GET_WEB_ID_CONFIRM            | Web ID confirmation.                                  |
| SET_WEB_ID_CONFIRM            | Web ID setup confirmed.                               |
| SET_PUSH_ID_CONFIRM           | Push ID setup confirmed.                              |
| DEBUG_CONFIRM                 | Debug request confirmation.                           |
| UPGRADE_CONFIRM               | Confirms firmware upgrade.                            |
| SET_DEVICE_SETTINGS_CONFIRM   | Confirms device settings update.                     |
| VERSION_CONFIRM               | Confirms version request.                             |
| GATEWAY_NOTIFICATION          | Notification from the gateway.                        |
| KEEP_ALIVE                    | Keeps the session alive.                              |
| FACTORY_RESET                 | Resets the device to factory defaults.               |
| CN_TIME_REQUEST               | Requests current time.                                |
| CN_TIME_CONFIRM               | Confirms time update.                                 |
| CN_NODE_REQUEST               | Node-related request (internal).                     |
| CN_NODE_NOTIFICATION          | Node status/update notification.                     |
| CN_RMI_REQUEST                | Remote method invocation request.                    |
| CN_RMI_RESPONSE               | Response to RMI request.                             |
| CN_RMI_ASYNC_REQUEST          | Asynchronous RMI request.                            |
| CN_RMI_ASYNC_CONFIRM          | Acknowledges async RMI.                              |
| CN_RMI_ASYNC_RESPONSE         | Response to async RMI.                               |
| CN_RPDO_REQUEST               | Requests updates for a property.                     |
| CN_RPDO_CONFIRM               | Confirms property update subscription.               |
| CN_RPDO_NOTIFICATION          | Notifies of a property update.                       |
| CN_ALARM_NOTIFICATION         | Notifies of alarms from the device.                  |
| CN_FUP_READ_REGISTER_REQUEST  | Firmware update read register request.               |
| CN_FUP_READ_REGISTER_CONFIRM  | Confirms read register request.                      |
| CN_FUP_PROGRAM_BEGIN_REQUEST  | Begins firmware update programming.                  |
| CN_FUP_PROGRAM_BEGIN_CONFIRM  | Confirms firmware update programming begin.          |
| CN_FUP_PROGRAM_REQUEST        | Firmware update programming data request.            |
| CN_FUP_PROGRAM_CONFIRM        | Confirms firmware update programming data request.   |
| CN_FUP_PROGRAM_END_REQUEST    | Ends firmware update programming.                    |
| CN_FUP_PROGRAM_END_CONFIRM    | Confirms end of firmware programming.                |
| CN_FUP_READ_REQUEST           | Requests firmware read.                              |
| CN_FUP_READ_CONFIRM           | Confirms firmware read request.                      |
| CN_FUP_RESET_REQUEST          | Requests firmware programming reset.                 |
| CN_FUP_RESET_CONFIRM          | Confirms firmware programming reset.                 |

## Strongly Typed Library

This library is strongly typed, providing full autocomplete functionality for known ComfoAirQ properties and message types. It makes interacting with the ComfoControl LAN-C bridge more straightforward and reliable. By leveraging TypeScript’s type system, you benefit from enhanced code completion, reduced runtime errors, and more precise typings when dealing with ComfoAirQ properties and messages.

## Credits 🙏

This library is based on the protocol documented by Michaël Arnauts. Special thanks to Michaël for his work in documenting the protocol.
