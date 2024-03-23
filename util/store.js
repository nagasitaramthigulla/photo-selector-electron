const {ipcMain} = require('electron');
const ElectronStore = require('electron-store');

const store = new ElectronStore('photo-selector');

const configure = ({ func = (v) => v, defObj = {}, key = 'config' } = {}) => {
	let obj = store.get(key, {});
	for (let [key, value] of Object.entries(defObj)) {
		obj[key] = obj[key] || value;
	}
	store.set(key, func(obj) || obj);
	return obj;
};



ipcMain.on('set-config', (_event, key, value) => {
	configure({
		func: (config) => {
			const path = key.split('.');
			let i;
			let obj = config;
			for (i = 0; i < path.length - 1; i++) {
				obj = obj[path[i]] = obj[path[i]] || {};
			}
			obj[path[i]] = value;
			return config;
		},
	});
});

module.exports = {configure};
