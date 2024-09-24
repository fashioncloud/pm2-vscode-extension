import * as vscode from "vscode";
import { PM2Tree } from "../model";

export const registerData = (pm2Tree: PM2Tree) => {
    vscode.window.registerTreeDataProvider("pm2-processes", pm2Tree);
};
