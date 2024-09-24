import * as vscode from "vscode";
import { registerCommands } from "./contributions/commands";
import { registerData } from "./contributions/data";
import { PM2Tree } from "./model";

let pm2Tree: PM2Tree;

export async function activate(context: vscode.ExtensionContext) {
    const settings = vscode.workspace.getConfiguration("pm2Explorer");

    pm2Tree = new PM2Tree(context, settings);

    registerCommands(pm2Tree);
    registerData(pm2Tree);
}

export function deactivate() {
    // no-op
}
