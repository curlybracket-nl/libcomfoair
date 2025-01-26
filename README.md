# lib-comfoair 🌬️

lib-comfoair is a TypeScript library for interacting with Zehnder ComfoAirQ ventilation units through the ComfoConnect LAN C gateway. It enables you to discover these gateways on your local network, read and write device properties, and subscribe to property change notifications.

This library is completely written in TypeScript and strongly typed, making development more reliable and maintainable.

## Features ✨

- 🔍 Discover Zehnder ComfoConnect LAN C gateways on your network.
- 📖 Read and write properties of Zehnder ComfoAirQ ventilation units.
- 🔄 Listen for real-time updates of changing properties.
- ⚙️ Strong typing ensures reliable code and easy maintainability.

## Installation 📦

#### NPM
```bash
npm i lib-comfoair
```

#### PNPM
```bash
pnpm add lib-comfoair
```

## Usage 🚀

Below are basic usage examples. The library can discover devices, start sessions to communicate with ventilation units, and request property updates.

### Discovering Devices

Use the discovery feature to find Zehnder ComfoConnect LAN C gateways on the same network. You can await the discovery process or attach event listeners.

```typescript
import { ComfoControlClient } from 'lib-comfoair';

// Discover a gateway with an optional limit:
ComfoControlClient.discover({ limit: 1 })
  .then(devices => {
    console.log('Discovered devices:', devices);
    // If desired, create a client and make requests:
    // const client = new ComfoControlClient(devices[0]);
    // await client.getServerTime();
  });

// Or listen for discovery events:
const discovery = ComfoControlClient.discover({ limit: 10 });
discovery.on('discover', device => {
  console.log('Discovered device:', device);
});
discovery.on('completed', () => {
  console.log('Discovery finished');
});
```

### How Device Discovery Works 🕵️‍♂️

Discovery sends a broadcast message and waits for devices to respond. This works only if the gateway is on the same subnet as the host running the discovery. Most routers do not forward broadcast messages to other subnets by default.

## Listening for Property Changes

After obtaining the device’s info, you can register property listeners that trigger when values change:

```typescript
import { ComfoControlClient, ComfoAirProperties } from 'lib-comfoair';

// Example usage (simplified):
const client = new ComfoControlClient({
  address: '192.168.1.10',
  uuid: 'your-device-uuid-here',
});

// Register a listener for OUTDOOR_AIR_TEMPERATURE:
await client.registerPropertyListener(ComfoAirProperties.OUTDOOR_AIR_TEMPERATURE, ({ value }) => {
  console.log(`Outdoor air temperature: ${value / 10} °C`);
});

// You may then connect or make a request:
console.log(await client.getServerTime());
```

## Available Opcodes

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
| SET_PUSH_ID_REQUEST           | Sets the push message ID.                             |
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
| CN_FUP_PROGRAM_BEGIN_CONFIRM  | Confirms program begin.                               |
| CN_FUP_PROGRAM_REQUEST        | Firmware update programming data request.            |
| CN_FUP_PROGRAM_CONFIRM        | Confirms firmware programming data request.          |
| CN_FUP_PROGRAM_END_REQUEST    | Ends firmware update programming.                    |
| CN_FUP_PROGRAM_END_CONFIRM    | Confirms end of firmware programming.                |
| CN_FUP_READ_REQUEST           | Requests firmware read.                              |
| CN_FUP_READ_CONFIRM           | Confirms firmware read request.                      |
| CN_FUP_RESET_REQUEST          | Requests firmware reset.                             |
| CN_FUP_RESET_CONFIRM          | Confirms firmware reset.                             |

## Strongly Typed Library

This library is strongly typed, ensuring that you benefit from autocompletion and reduced runtime errors. It adds clarity when dealing with ComfoAirQ properties and messages by leveraging TypeScript’s type system.

## Credits 🙏

This project is based on the protocol specifications documented by Michaël Arnauts. Thank you to Michaël for making this information available.
