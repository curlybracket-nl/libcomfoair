import { ComfoControlClient } from './comfoControlClient.js';
import { ComfoAirProperties } from './deviceProperties.js';
import { ComfoControlServerInfo } from './discoveryOperation.js';
import { Logger, ConsolePrinter, LogLevel } from './util/logging';

Logger.getRoot().addPrinter(new ConsolePrinter()).setLogLevel(LogLevel.DEFAULT).setName('comfo-connect');

(async () => {
    ComfoControlClient.discover({ limit: 1 })
        .on('discover', async (server: ComfoControlServerInfo) => {
            const logger = Logger.getRoot();
            const client = new ComfoControlClient(server);

            logger.info(`Server time: ${await client.getServerTime()}`);

            await client.registerPropertyListener(ComfoAirProperties.OUTDOOR_AIR_TEMPERATURE, ({ value }) => {
                logger.info(`Outdoor air temprature: ${value / 10}`);
            });
            await client.registerPropertyListener(ComfoAirProperties.SUPPLY_AIR_TEMPERATURE, ({ value }) => {
                logger.info(`Supply air temprature: ${value / 10}`);
            });
            await client.registerPropertyListener(ComfoAirProperties.EXHAUST_FAN_SPEED, ({ value }) => {
                logger.info(`Exhaust fan speed: ${value}`);
            });
        })
        .then((bridges) => {
            console.log(bridges);
        });
})();
