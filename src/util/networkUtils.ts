import os from 'os';

export class NetworkUtils {
    /**
     * Get all available broadcast addresses on the current machine.
     * @returns An array of broadcast addresses.
     */
    static getBroadcastAddresses(): string[] {
        const interfaces = os.networkInterfaces();
        const broadcastAddresses: string[] = [];

        for (const name of Object.keys(interfaces)) {
            for (const net of interfaces[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    const addressParts = net.address.split('.').map(Number);
                    const netmaskParts = net.netmask.split('.').map(Number);
                    const broadcastParts = addressParts.map((part, index) => part | (~netmaskParts[index] & 255));
                    broadcastAddresses.push(broadcastParts.join('.'));
                }
            }
        }

        return broadcastAddresses;
    }
}
