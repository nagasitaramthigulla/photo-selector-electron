const { app, dialog, ipcMain } = require('electron');
const gfs = require('graceful-fs');
const path = require('path');
const { configure } = require('./util/store');
const { createMainWindow } = require('./util/window');
const { sendTheme } = require('./util/theme');
const Server = require('./util/server');

let mainWindow;
app.whenReady().then(() => {
	console.log(process.env.NODE_ENV);
	const staticPath = path.join(__dirname, 'src/public');
	const mainFile = path.join(staticPath, 'index.html');
	let server = new Server(staticPath);
	server.start().then(() => {
		mainWindow = createMainWindow(server.getAddress());
		app.on('activate', () => {
			mainWindow = createMainWindow(server.getAddress());
		});
	});
});

ipcMain.on('on-load', () => {
	sendTheme();
	let config = configure();
	let folders = config.folders;
	for (const [input, folderName] of Object.entries(folders)) {
		mainWindow.webContents.send('folder', { input, folderName });
	}
	let photos = config.photos;
	if (photos) {
		mainWindow.webContents.send(
			'photosLoaded',
			photos.files,
			photos.currentPhotoIndex
		);
	}
});

ipcMain.on('selectFolderDialog', (_event, input) => {
	dialog
		.showOpenDialog({
			properties: ['openDirectory'],
		})
		.then(function (folder) {
			if (folder !== undefined) {
				let folderName = folder.filePaths[0];
				mainWindow.webContents.send('folder', { input, folderName });
			}
		});
});

ipcMain.on('loadPhotos', (_event, folderName) => {
	configure({
		func: (config) => {
			let files = gfs
				.readdirSync(folderName)
				.filter((file) => {
					let extension = file.toLocaleLowerCase().split('.').pop();
					if (['png', 'jpg', 'jpeg'].indexOf(extension) != '-1') {
						return true;
					}
					return false;
				})
				.map((file) => path.resolve(folderName, file));
			config.photos = config.photos || { currentPhotoIndex: 0 };
			config.photos.files = files;
			mainWindow.webContents.send('photosLoaded', files, 0);
			return config;
		},
	});
});

ipcMain.on('copyPhoto', (_event, file, targetFolder) => {
	try {
		let targetFile = path.resolve(targetFolder, path.basename(file));
		console.log(_event, file, targetFile);
		gfs.copyFileSync(file, targetFile);
		mainWindow.webContents.send('alert', 'Photo copied.');
	} catch (e) {
		console.log(e);
		mainWindow.webContents.send('alert', 'Error copying photo.', 'error');
	}
});
