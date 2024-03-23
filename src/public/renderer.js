const { ipcRenderer } = require('electron');

let sourceFolderInput;

document.addEventListener('DOMContentLoaded', function () {
	sourceFolderInput = document.getElementById('source-folder');
	const destinationFolderInput = document.getElementById('destination-folder');
	const loadImagesButton = document.getElementById('load-images');
	const photo = document.getElementById('photo');
	const prevButton = document.getElementById('prev');
	const nextButton = document.getElementById('next');
	const zoomInput = document.getElementById('zoom');
	const copyPhotoButton = document.getElementById('copy-photo');
	const message = document.getElementById('message');
	const browseSourceButton = document.getElementById('browse-source');
	const browseDestinationButton = document.getElementById('browse-destination');
	const cardBody = document.querySelector('.card-body');
	message.value = ipcRenderer.toString();
	let skip = 1;

	const inputs = {
		data: {},
		setInput: function (inputEl) {
			this.data[inputEl.id] = inputEl;
		},
		getInput: function (id) {
			return this.data[id];
		},
	};

	inputs.setInput(sourceFolderInput);
	inputs.setInput(destinationFolderInput);

	let currentPhotoIndex = 0;
	let photos = [];
	let zoomLevel = zoomInput.value;

	loadImagesButton.addEventListener('click', loadPhotos);
	prevButton.addEventListener('click', showPreviousPhoto);
	nextButton.addEventListener('click', showNextPhoto);
	zoomInput.addEventListener('input', updateZoom);
	copyPhotoButton.addEventListener('click', copySelectedPhoto);
	browseSourceButton.addEventListener('click', browseSource);
	browseDestinationButton.addEventListener('click', browseDestination);
	destinationFolderInput.addEventListener('change', saveFolderData);
	sourceFolderInput.addEventListener('change', saveFolderData);
	sourceFolderInput.addEventListener('change', () => {
		ipcRenderer.send();
	});
	function saveFolderData(event) {
		setConfig('folders.' + event.target.id, event.target.value);
	}
	document.onkeydown = function (event) {
		if (event.ctrlKey) {
			switch (event.key) {
				case 'ArrowLeft':
					showPreviousPhoto();
					return;
				case 'ArrowRight':
					showNextPhoto();
					return;
				case '>':
					zoomInput.value = Math.min(2.0, zoomLevel + 0.1);
					updateZoom();
					return;
				case '<':
					zoomInput.value = Math.max(0.1, zoomLevel - 0.1);
					updateZoom();
					return;
				case 's':
					copySelectedPhoto();
					return;
				case 'I':
					ipcRenderer.send('devtools');
					return;
				case 'i':
					setMessage(
						`Current photo index '${currentPhotoIndex + 1}/${photos.length}'.`
					);
					return;
			}
			if (/^[0-9]$/i.test(event.key)) {
				skip = 1 << parseInt(event.key);
				setMessage(`Skipping level set to  '${skip}'.`, 'info');
			}
		}
	};

	function setMaxZoomLevel() {
		let maxZoomLevel = Math.round(parseFloat(cardBody.clientWidth) / 100) / 10;
		zoomInput.max = maxZoomLevel;
	}

	const resizeObserver = new ResizeObserver((entries) => {
		setMaxZoomLevel();
	});

	resizeObserver.observe(cardBody);

	ipcRenderer.on('photosLoaded', (event, loadedPhotos, cpi) => {
		if (loadedPhotos && loadedPhotos.length) {
			photos = loadedPhotos;
			currentPhotoIndex = Math.max(0, Math.min(cpi, loadedPhotos.length - 1));
			displayPhoto();
		} else {
			showModalDialog('configurationModal');
		}
	});

	function showPreviousPhoto() {
		if (currentPhotoIndex > 0) {
			currentPhotoIndex = Math.max(currentPhotoIndex - skip, 0);
			displayPhoto();
		} else {
			setMessage('First photo.', 'info');
		}
	}

	function showNextPhoto() {
		if (currentPhotoIndex < photos.length - 1) {
			currentPhotoIndex = Math.min(photos.length - 1, currentPhotoIndex + skip);
			displayPhoto();
		} else {
			setMessage('Last photo.', 'info');
		}
	}

	function updateZoom() {
		zoomLevel = parseFloat(zoomInput.value);
		photo.style = '';
		photo.style.width = `${zoomLevel * 1000}px`;
		renderPhoto();
	}

	function copySelectedPhoto() {
		if (!destinationFolderInput.value) {
			setMessage('Destination folder is not selected.', 'warning');
			return;
		}
		if (photos.length > 0) {
			ipcRenderer.send(
				'copyPhoto',
				photos[currentPhotoIndex],
				destinationFolderInput.value
			);
		}
	}

	function renderPhoto() {
		if (photos.length > 0) {
			const photoPath = photos[currentPhotoIndex];
			photo.src = photoPath;
		}
	}

	function displayPhoto() {
		if (photos.length > 0) {
			let hiddenPhoto = new Image();
			hiddenPhoto.src = photos[currentPhotoIndex];
			hiddenPhoto.onload = function () {
				let ratio = hiddenPhoto.naturalWidth / hiddenPhoto.naturalHeight;
				let requiredWidth = ratio * (screen.availHeight - 140);
				zoomInput.value = requiredWidth / 1000;
				setTimeout(updateZoom, 0);
			};
			setConfig('photos.currentPhotoIndex', currentPhotoIndex);
		}
	}

	function browseSource() {
		ipcRenderer.send('selectFolderDialog', sourceFolderInput.id);
	}

	function browseDestination() {
		ipcRenderer.send('selectFolderDialog', destinationFolderInput.id);
	}

	ipcRenderer.on('folder', (event, data) => {
		let target = inputs.getInput(data.input);
		if (target) {
			target.value = data.folderName || '';
			saveFolderData({ target });
		}
	});

	ipcRenderer.on('alert', (event, value, type) => {
		setMessage(value, type);
	});

	ipcRenderer.on('toggle-theme', (event, theme, configuredTheme) => {
		const html = document.getElementsByTagName('html')[0];
		html.setAttribute('data-bs-theme', theme);
		let settingsModal = document.querySelector('#dialogs > #settingsModal');
		if (settingsModal) {
			let themeDropdown = settingsModal.querySelector('#themeDropdown');
			if (themeDropdown) {
				themeDropdown.value = configuredTheme;
			}
		}
	});

	ipcRenderer.send('on-load');

	setMaxZoomLevel();

	addDialogsToMenu();
});

function setTheme(theme) {
	ipcRenderer.send('set-theme', theme);
}

function loadPhotos() {
	let sourceFolder = sourceFolderInput.value;
	if (sourceFolder) ipcRenderer.send('loadPhotos', sourceFolder);
	else setMessage('Select source folder.', 'warning');
}

function showToast(message, type = 'success') {
	const toastContainer = document.getElementById('toast-container');
	const toast = new bootstrap.Toast(toastContainer, {
		animation: true,
		autohide: true,
		delay: 3000,
	});

	var toastBody = toastContainer.querySelector('.toast-body');
	toastBody.innerText = message;
	if (type === 'success') {
		toastContainer.classList.remove('bg-danger', 'bg-warning', 'bg-info');
		toastContainer.classList.add('bg-success');
	} else if (type === 'error') {
		toastContainer.classList.remove('bg-success', 'bg-warning', 'bg-info');
		toastContainer.classList.add('bg-danger');
	} else if (type === 'info') {
		toastContainer.classList.remove('bg-success', 'bg-danger', 'bg-warning');
		toastContainer.classList.add('bg-info');
	} else if (type === 'warning') {
		toastContainer.classList.remove('bg-success', 'bg-danger', 'bg-info');
		toastContainer.classList.add('bg-warning');
	}

	toast.show();
}

function addDialogsToMenu() {
	let dialogs = document.getElementById('dialogs');
	let dropDownMenu = document.getElementById('nav-menu-items');
	for (let modal of dialogs.getElementsByClassName('modal')) {
		let label = modal.querySelector(
			`#${modal.getAttribute('aria-labelledby')}`
		);
		let li = document.createElement('li');
		li.innerHTML = `<a class="dropdown-item" href="#" id="show-${modal.id}" onclick="showModalDialog('${modal.id}')">${label.innerText}</a>`;
		dropDownMenu.appendChild(li);
	}
}

function showModalDialog(id) {
	let dialogs = document.getElementById('dialogs');
	let modal = new bootstrap.Modal(dialogs.querySelector(`#${id}`));
	modal.show();
}

function resetSettings() {
	setTheme('system');
	setConfig('folders', {});
	setConfig('photos', {});
}

function setConfig(key, value) {
	ipcRenderer.send('set-config', key, value);
}

function setMessage(value, type) {
	showToast(value, type || 'success');
}
