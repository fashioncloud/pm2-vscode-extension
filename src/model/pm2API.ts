import * as pm2 from "pm2";
import * as util from './../util';

export {
    Proc,
    ProcessDescription,
} from 'pm2';

let connected = false;
interface PM2PacketLog {
    process: {
        namespace: string;
        name: string;
        pm_id: number;
        rev: string;
    };
    at: number;
    data: unknown;
}
interface PM2Bus {
    on(event: string, callback: (packet: PM2PacketLog) => void): void;
}

async function getBus() {
    const launchedBus = await pm2Client().then(pm2 =>
        new Promise<PM2Bus>((resolve, reject) => {
            pm2.launchBus((err, bus: PM2Bus) => {
                if(err) {
                    util.showErr("Could not connect to PM2 bus");
                    reject(err)
                    return;
                }

                resolve(bus);
            })
        }));

    return launchedBus;
};

const pm2Client = () => {
    return new Promise<typeof pm2>((resolve, reject) => {
        if(connected) {
            resolve(pm2);
            return;
        }
        pm2.connect((error) => {
            if(error) {
                util.showErr("Could not connect to PM2");
                reject();
                return;
            }
            util.showMsg('Connected to PM2');
            connected = true;
            resolve(pm2);
        })

    })
}

const listProcesses = async (util: { showErr: (msg: string) => void })  => {
    const _pm2 = await pm2Client();
    const processes = await new Promise<pm2.ProcessDescription[]>(resolve =>
        _pm2.list((errr, processes) => {
            if(errr) {
                util.showErr("Could not list processes");
                resolve([]);
                return;
            }

            resolve(processes);
        })
    );

    return processes;
}

export {
    getBus,
    listProcesses,
    pm2Client,
    PM2Bus,
    PM2PacketLog as PM2Packet,
};

