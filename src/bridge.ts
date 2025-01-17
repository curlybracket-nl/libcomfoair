import { BridgeDetails, BridgeDiscoveryOperation } from "./discoveryOperation.js";
import { NetworkUtils } from './util/networkUtils.js';

interface DiscoverOptions {
    broadcastAddresses?: string | string[];
    timeout?: number;
    limit?: number;
    abortSignal?: AbortSignal;
}

export class Bridge {

    /**
     * Create a new Bridge instance with the specified details. 
     * Use the static discover method to find bridges on the network if you do not have the details.
     */
    constructor(private readonly details: BridgeDetails) {
    }

    /**
     * Discover bridges on the network using a {@link BridgeDiscoveryOperation}. The discovery process will run for the specified timeout or until the limit of bridges is reached. 
     * If no timeout is specified, the default timeout is 30 seconds. If no limit is specified, all discovered bridges will be returned.
     * The operation can be aborted using an AbortSignal, see {@link https://nodejs.org/api/globals.html#class-abortsignal} for details on how to use the AbortSignal.
     * @param options - The options for the discovery process.
     * @returns A {@link BridgeDiscoveryOperation} instance that can be used to listen for discovered bridges.
     */
    static discover(options?: DiscoverOptions) : BridgeDiscoveryOperation {
        return new BridgeDiscoveryOperation(options.broadcastAddresses ?? NetworkUtils.getBroadcastAddresses()).discover({
            timeout: options.timeout ?? 30000,
            limit: options.limit
        }, options.abortSignal);
    }
}