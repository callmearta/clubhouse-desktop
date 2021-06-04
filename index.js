"use strict";
const path = require("path");
const os = require("os");
const {
	app,
	BrowserWindow,
	Menu,
	systemPreferences,
	globalShortcut
} = require("electron");
require("electron-reload")(__dirname);
const { is } = require("electron-util");
const unhandled = require("electron-unhandled");
const debug = require("electron-debug");
const contextMenu = require("electron-context-menu");
const config = require('./config');
const menu = require("./menu");

if (os.platform() == "darwin") {
	systemPreferences.askForMediaAccess("microphone").then(isAllowed => {
		console.log("isAllowed", isAllowed);
	});
}

unhandled();
debug();
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId("com.company.ClubHouse");
app.commandLine.appendSwitch("ignore-certificate-errors");

let mainWindow;

const createMainWindow = async () => {
	const ws = config.get('windowstate', {});
	const win = new BrowserWindow({
		title: "Clubhouse Desktop Client",
		show: false,
		width: ws.width || 1020,
		height: ws.height || 800,
		minWidth: 965,
		minHeight: 500,
		autoHideMenuBar: true, // Hides menubar on Top
		// titleBarStyle: "hidden",
		fullscreenable: false,
		isMaximized: ws.isMaximized,
		frame: true,
		resizable: true,
		icon: path.join(__dirname, "static/icon.png"),
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInSubFrames: true,
			nodeIntegrationInWorker: true
			// devTools: false
		}
	});

	app.on("ready", () => {
		// Register a shortcut listener for Ctrl + Shift + I
		globalShortcut.register("Control+Shift+I", () => {
			// When the user presses Ctrl + Shift + I, this function will get called
			// You can modify this function to do other things, but if you just want
			// to disable the shortcut, you can just return false
			return false;
		});
	});

	win.on("ready-to-show", () => {
		win.show();
	});

	win.on("closed", () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	win.on("close", () => {
		const isMaximized = win.isMaximized();
		const bounds = win.getBounds();
		
		config.set('windowstate', {
			height: bounds.height,
			width: bounds.width,
			isMaximized: isMaximized
		});
	});

	await win.loadFile(path.join(__dirname, "index.html"));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on("second-instance", () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on("window-all-closed", () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on("activate", async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
	mainWindow.webContents.on("new-window", function(e, url) {
		e.preventDefault();
		require("electron").shell.openExternal(url);
	});
})();
