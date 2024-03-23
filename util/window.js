const { BrowserWindow, ipcMain, nativeTheme, app } = require('electron');
const { configure } = require('./store');
const path = require('path');
let mainWindow;

module.exports.getMainWindow = () => mainWindow;

module.exports.createMainWindow = (mainFile, isURL = true) => {
	if (BrowserWindow.getAllWindows().length !== 0) {
		return (mainWindow = BrowserWindow.getAllWindows()[0]);
	}
	let config = configure({
		defObj: {
			mainWindow: { width: 800, height: 600 },
			theme: 'system',
			folders: {},
			photos: {},
		},
	});
	nativeTheme.themeSource = 'system';
	mainWindow = new BrowserWindow({
		...config.mainWindow,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			webSecurity: false
		},
	});
	mainWindow.loadURL(mainFile);
	ipcMain.on('devtools', () => {
		if (mainWindow.webContents.isDevToolsOpened()) {
			mainWindow.webContents.closeDevTools();
		} else {
			mainWindow.webContents.openDevTools();
		}
	});

	mainWindow.on('resize', () => {
		configure({
			func: (config) => {
				config.mainWindow.width = mainWindow.getSize()[0];
				config.mainWindow.height = mainWindow.getSize()[1];
				return config;
			},
			defObj: { mainWindow: {} },
		});
	});

	return mainWindow;
};

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});
