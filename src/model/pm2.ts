// import { statSync } from "fs";
// @ts-ignore
import { setInterval } from "timers/promises";
import * as pm2 from "pm2";
import * as vscode from "vscode";
import * as util from "../util";
import { Process } from "./process";

let connected = false;

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

export class PM2
    implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<
        Process | undefined
    > = new vscode.EventEmitter<Process | undefined>();

    readonly onDidChangeTreeData: vscode.Event<Process | undefined> = this
        ._onDidChangeTreeData.event;
    // @ts-ignore
    private _processes: pm2.ProcessDescription[] = [];
    // @ts-ignore
    private _isRefreshing = false;
    // @ts-ignore
    private _isDisposed = false;

    constructor(
        private _context: vscode.ExtensionContext,
        // @ts-ignore
        private readonly _config: vscode.WorkspaceConfiguration
    ) {
        // this.startProcessWatcher();
    }

    // private async startProcessWatcher() {
    //     const interval = this._config.get<number>("refreshIntervalMs") || 1000;
    //     for await (const _startTime of setInterval(interval, Date.now())) {
    //         if (this._isRefreshing || this._isDisposed){
    //             continue;
    //         }
    //         this._isRefreshing = true;
    //         this._processes = await listProcesses(util);
    //         this._isRefreshing = false;
    //     }
    // }

    dispose() {
        this._isDisposed = true;
    }

    logs(process?: pm2.ProcessDescription) {
        util.showMsg(`Opening logs for ${process?.name ?  process?.name + " process" : "all processes"}`);
        const terminal = vscode.window.createTerminal(`PM2 ${process?.name || ''} logs`);
        const command = `pm2 logs ${process && process.name ? process.name : ""}`;
        let execution: vscode.TerminalShellExecution;
        vscode.window.onDidChangeTerminalShellIntegration(event => {
            console.log('onDidChangeTerminalState', event);
            if(terminal.shellIntegration) {
                execution = terminal.shellIntegration.executeCommand(command);
            } else {
                terminal.sendText(
                    `pm2 logs '${process && process.name ? process.name : ""}'`
                );
            }
            terminal.show();
        });
        vscode.window.onDidEndTerminalShellExecution(event => {
            if (event.execution === execution) {
                terminal.dispose();
            }
        });
    }

    flushLogs(process?: pm2.ProcessDescription) {
        util.showMsg(`Flushing logs for ${process?.name ? process?.name + " process" : "all" }`);
        pm2Client().then(pm2 => {
            pm2.flush(process?.name || 'all', util.errCallback(() => {
                util.showMsg(`Flushed logs for ${process?.name ? process?.name + " process" : "all" }`);
            }));
        });
    }

    reloadAll() {
        pm2Client().then(pm2 => {
            pm2.reload("all", util.errCallback());
        });
    }

    async startAll() {
        try {
            await pm2Client().then(pm2 =>
                new Promise<pm2.Proc>((resolve, reject) => {
                    pm2.start({}, (err, proc) => {
                        if(err) {
                            reject(err);
                            return;
                        }
                        resolve(proc);
                    })
                })
            );
            util.showMsg("Started all processes");
            this._onDidChangeTreeData.fire(undefined);
        } catch (error) {
            console.error('PM2 error: starting all processes failed', error);
            util.showErr("Could not start all processes");
        }
    }

    async stopAll() {
        try {
            await pm2Client().then(pm2 =>
                new Promise<pm2.Proc>((resolve, reject) => {
                    pm2.stop('all', (err, proc) => {
                        if(err) {
                            reject(err);
                            return;
                        }
                        resolve(proc);
                    })
                })
            );
            util.showMsg("Stopped all processes");
            this._onDidChangeTreeData.fire(undefined);
        } catch (error) {
            console.error('PM2 error: stopping all processes failed', error);
            util.showErr("Could not stop all processes");
        }
    }

    reload(process: pm2.ProcessDescription) {
        pm2Client().then(pm2 => {
            pm2.reload(
                process.name!,
                util.errCallback(() => {
                    util.showMsg(`Reloaded process ${process.name}`);
                })
            );
        });
    }

    /**
     * Reloads the environment of a process. This is done by executing pm2 delete command and then pm2 start ecosystem.config.js --only <process name>.
     * ecosystem.config.js is the configuration file foxr pm2 and it will be defined at ~/Documents/workspace/docker-compose. So it needs to reference that file
     * @param process The process to reload
     */
    reloadEnv(process: pm2.ProcessDescription) {
        // util.showMsg(`Reloading envs for ${process.name}. Will look for ecosystem.config.js at ~/Documents/workspace/docker-compose at ~/Documents/workspace/docker-compose/docker-compose`);
        // const terminal = vscode.window.createTerminal(`PM2 Reload envs: ${process.name}`);
        // const deleteCommand = `pm2 delete ${process.name}`;
        // if(statSync("~/Documents/workspace/docker-compose/docker-compose/ecosystem.config.js", { throwIfNoEntry: false })) {
        //     util.showMsg(`Found ecosystem.config.js at ~/Documents/workspace/docker-compose/docker-compose`);
        //     terminal.show();
        //     terminal.sendText(deleteCommand);
        //     terminal.sendText(`pm2 reload ~/Documents/workspace/docker-compose/docker-compose/ecosystem.config.js --only ${process.name}`);
        // } else if(statSync("./ecosystem.config.js", { throwIfNoEntry: false })) {
        //     util.showMsg(`Found ./ecosystem.config.js`);
        //     terminal.show();
        //     terminal.sendText(deleteCommand);
        //     terminal.sendText(`pm2 reload ./ecosystem.config.js --only ${process.name}`);
        // } else {
        //     terminal.dispose();
        //     util.showErr("Could not find ecosystem.config.js at ~/Documents/workspace/docker-compose/docker-compose or ~/Documents/workspace/docker-compose");
        //     return;
        // }
    }


    refresh() {
        this._onDidChangeTreeData.fire(undefined);
        listProcesses(util).then(processes => this._processes = processes);
    }

    getTreeItem(element: Process): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(
        element?: Process | undefined
    ): vscode.ProviderResult<vscode.TreeItem[]> {
        if (!element) {
            return listProcesses(util).then(
                processes => processes.map(process => new Process(process, pm2Client(), this._context, this._onDidChangeTreeData))
            );
        }
        return element.children;
    }
}
