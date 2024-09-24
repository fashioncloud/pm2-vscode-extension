import * as path from "path";
import * as nodePm2 from "pm2";
import * as vscode from "vscode";
import { errCallback, showMsg } from "../util";

const getProcessLabel = (process: nodePm2.ProcessDescription): string => {
    return process.name!;
};

export class ProcessTreeItem extends vscode.TreeItem {
    public readonly label?: string;
    public readonly contextValue = "pm2-process";

    constructor(
        public readonly process: nodePm2.ProcessDescription,
        private readonly _pm2: Promise<typeof nodePm2>,
        private _context: vscode.ExtensionContext,
        private readonly _onDidChangeTreeData: vscode.EventEmitter<
            ProcessTreeItem | undefined
        >
    ) {
        super(
            getProcessLabel(process),
            vscode.TreeItemCollapsibleState.Collapsed
        );
        this.label = getProcessLabel(process);
        this.iconPath = this.getIconPath();
        this.tooltip = this.getTooltip();
    }

    start() {
        this._pm2.then(pm2 =>
            pm2.start(
                {
                    name: this.process.name!
                },
                errCallback(() =>{
                    showMsg(`Started process ${this.process.name}`)
                    this.iconPath = this.getIconPath();
                    this._onDidChangeTreeData.fire(undefined);
                })
            )
        );
    }

    stop() {
        this._pm2.then(pm2 =>
            pm2.stop(
                this.process.name!,
                errCallback(() =>{
                    showMsg(`Stopped process ${this.process.name}`);
                    this.iconPath = this.getIconPath();
                    this._onDidChangeTreeData.fire(undefined);
                })
            )
        );
    }

    private getIconPath(): string | undefined {
        const { status } = this.process.pm2_env!;
        switch (status) {
            case "errored":
            case "online":
            case "stopped":
                return this._context.asAbsolutePath(
                    path.join("resources", `${status}.png`)
                );
            case "launching":
                return this._context.asAbsolutePath(
                    path.join("resources", `${status}.gif`)
                );
        }
    }

    private getTooltip(): string {
        return `Name: ${this.label}
PID: ${this.process.pid}`;
    }

    get children(): vscode.TreeItem[] {
        return [
            new vscode.TreeItem(`Status: ${this.process.pm2_env!.status}`),
            new vscode.TreeItem(
                `Instances: ${this.process.pm2_env!.instances}`
            ),
            new vscode.TreeItem(`Uptime: ${this.process.pm2_env!.pm_uptime}`),
            new vscode.TreeItem(
                `Unstable restarts: ${this.process.pm2_env!.unstable_restarts}`
            )
        ];
    }
}
