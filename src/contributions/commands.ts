import * as vscode from "vscode";
import { PM2Tree, ProcessTreeItem } from "../model";
import { getBus, PM2Packet } from "../model/pm2API";


export const registerCommands = (pm2: PM2Tree) => {
    vscode.commands.registerCommand("pm2.reload", (item: ProcessTreeItem) => {
        pm2.reload(item.process);
    });

    vscode.commands.registerCommand("pm2.reloadEnv", (item: ProcessTreeItem) => {
        // pm2.reloadEnv(item.process);
    });

    vscode.commands.registerCommand("pm2.logsOnTerminal", (item: ProcessTreeItem) => {
        pm2.logs(item.process);
    });

    vscode.commands.registerCommand("pm2.logsOnChannel", async (item: ProcessTreeItem) => {
        const logChannel = vscode.window.createOutputChannel(
            `${item.process.name} logs`,
        );
        logChannel.show();
        const bus = await getBus();
        bus.on("log:out", (packet: PM2Packet) => {
            if (packet.process.name === item.process.name) {
                logChannel.appendLine(`${packet.data as string}`);
            }
        });
        bus.on("log:err", (packet: PM2Packet) => {
            if (packet.process.name === item.process.name) {
                logChannel.appendLine(`${packet.data as string}`);
            }
        });
    });

    vscode.commands.registerCommand("pm2.flushLogs", (item: ProcessTreeItem) => {
        pm2.flushLogs(item.process);
    });

    vscode.commands.registerCommand("pm2.start", (item: ProcessTreeItem) => {
        item.start();
    });

    vscode.commands.registerCommand("pm2.stop", (item: ProcessTreeItem) => {
        item.stop();
    });

    vscode.commands.registerCommand("pm2.logsAll", () => {
        pm2.logs();
    });

    vscode.commands.registerCommand("pm2.flushAll", () => {
        pm2.flushLogs();
    });

    vscode.commands.registerCommand("pm2.startAll", () => {
        pm2.startAll();
    });

    vscode.commands.registerCommand("pm2.stopAll", () => {
        pm2.stopAll();
    });

    vscode.commands.registerCommand("pm2.reloadAll", () => {
        pm2.reloadAll();
    });

    vscode.commands.registerCommand("pm2.refresh", () => {
        pm2.refresh();
    });
};
