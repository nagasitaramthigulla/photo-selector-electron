const {nativeTheme, ipcMain} = require('electron');
const {getMainWindow} = require('./window');
const {configure} = require('./store');

function getConfiguredTheme() {
	return configure({ defObj: { theme: 'system' } }).theme;
}

function getSystemTheme() {
	return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function sendTheme(theme, configuredTheme) {
	configuredTheme = configuredTheme || getConfiguredTheme();
	theme = theme || configuredTheme;
	getMainWindow().webContents.send(
		'toggle-theme',
		theme == 'system' ? getSystemTheme() : theme,
		configuredTheme
	);
}

ipcMain.on('set-theme', (_event, inputTheme) => {
	let { theme } = configure({
		func: (config) => {
			config.theme = inputTheme;
		},
	});
	sendTheme(theme, theme);
});

nativeTheme.addListener('updated', () => {
	let {theme} = configure();
	if (theme == 'system') {
		sendTheme(theme, theme);
	}
});

module.exports = {sendTheme};