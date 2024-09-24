
import * as vscode from "vscode";
import * as util from "../util";
import { ProcessTreeItem } from "./process";
import {
    pm2Client,
    listProcesses,
    ProcessDescription,
    Proc
} from './pm2API';

export class PM2Tree
    implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        ProcessTreeItem | undefined
    > = new vscode.EventEmitter<ProcessTreeItem | undefined>();

    readonly onDidChangeTreeData: vscode.Event<ProcessTreeItem | undefined> = this
        ._onDidChangeTreeData.event;

    constructor(
        private _context: vscode.ExtensionContext,
        // @ts-ignore
        private readonly config?: vscode.WorkspaceConfiguration,
    ) {}

    logs(process?: ProcessDescription) {
        util.showMsg(`Opening logs for ${process?.name ?  process?.name + " process" : "all processes"}`);
        const terminal = vscode.window.createTerminal(`PM2 ${process?.name || ''} logs`);
        const command = `pm2 logs ${process && process.name ? process.name : ""}`;
        let execution: vscode.TerminalShellExecution;
        vscode.window.onDidChangeTerminalShellIntegration(event => {
            console.log('onDidChangeTerminalState', event);
            if(terminal.shellIntegration) {
                execution = terminal.shellIntegration.executeCommand(command);
            } else {
                terminal.sendText(command);
            }
            terminal.show();
        });
        vscode.window.onDidEndTerminalShellExecution(event => {
            if(event.exitCode !== 0) {
                util.showErr(`Failed to open logs for ${process?.name ? process.name + " process" : "all processes"} with exit code ${event.exitCode}`);
            }
            if (event.execution === execution) {
                terminal.dispose();
            }
        });
    }

    flushLogs(process?: ProcessDescription) {
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
                new Promise<Proc>((resolve, reject) => {
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
                new Promise<Proc>((resolve, reject) => {
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

    reload(process: ProcessDescription) {
        pm2Client().then(pm2 => {
            pm2.reload(
                process.name!,
                util.errCallback(() => {
                    util.showMsg(`Reloaded process ${process.name}`);
                })
            );
        });
    }


    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: ProcessTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(
        element?: ProcessTreeItem | undefined
    ): vscode.ProviderResult<vscode.TreeItem[]> {
        if (!element) {
            return listProcesses(util).then(
                processes => processes.map(process => new ProcessTreeItem(process, pm2Client(), this._context, this._onDidChangeTreeData))
            );
        }
        return element.children;
    }
}
