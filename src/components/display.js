const dismissedContentCache = {};
const dismissedRestoreCache = {};

module.exports = {
	atRoot: [ 'show', 'hide' ],
	public: [ 'show', 'hide' ],

	delegatedEvents: {
		click: {
			[`.${ns}-close-button`]: 'hide',
			[`.${ns}-dismiss-link`]: 'display._handleDismiss',
			[`.${ns}-restore-link`]: 'display._handleRestore'
		},
		fullscreenchange: {
			[`.${ns}-player`]: 'display._handleFullScreenChange'
		},
		drop: {
			[`#${ns}-container`]: 'display._handleDrop'
		}
	},

	undelegatedEvents: {
		click: {
			body: 'display.closeDialogs'
		},
		keydown: {
			body: e => e.key === 'Escape' && Player.display.closeDialogs(e)
		}
	},

	initialize: async function () {
		try {
			Player.display.dismissed = (await GM.getValue('dismissed')).split(',');
		} catch (err) {
			Player.display.dismissed = [];
		}
		Player.on('playsound', () => {
			// Reset marquees
			Player.display._marquees = {};
			!Player.display._marqueeTO && Player.display.runTitleMarquee();
		});
		// Store the rem size
		Player.remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
	},

	/**
	 * Create the player show/hide button in to the 4chan X header.
	 */
	createPlayerButton: function () {
		if (Site === 'FoolFuuka') {
			// Add a sounds link in the nav for archives
			const nav = document.querySelector('.navbar-inner .nav:nth-child(2)');
			const li = _.element('<li><a href="javascript:;">Sounds</a></li>', nav);
			li.children[0].addEventListener('click', Player.display.toggle);
		} else if (Site === 'Fuuka') {
			const br = document.querySelector('body > div > br');
			br.parentNode.insertBefore(document.createTextNode('['), br);
			_.elementBefore('<a href="javascript:;">Sounds</a>', br, { click: Player.display.toggle });
			br.parentNode.insertBefore(document.createTextNode(']'), br);
		} else if (isChanX) {
			// Add a button in the header for 4chan X.
			const showIcon = _.elementBefore(`<span id="shortcut-sounds" class="shortcut brackets-wrap" data-index="0">
				<a href="javascript:;" title="Sounds" class="fa fa-play-circle">Sounds</a>
			</span>`, document.getElementById('shortcut-settings'));
			showIcon.querySelector('a').addEventListener('click', Player.display.toggle);
		} else {
			// Add a [Sounds] link in the top and bottom nav for native 4chan.
			document.querySelectorAll('#settingsWindowLink, #settingsWindowLinkBot').forEach(function (link) {
				_.elementBefore('<a href="javascript:;">Sounds</a>', link, { click: Player.display.toggle });
				link.parentNode.insertBefore(document.createTextNode('] ['), link);
			});
		}
	},

	/**
	 * Render the player.
	 */
	render: async function () {
		try {
			if (Player.container) {
				document.body.removeChild(Player.container);
				document.head.removeChild(Player.stylesheet);
			}

			// Create the main stylesheet.
			Player.display.updateStylesheet();

			// Create the main player. For native threads put it in the threads to get free quote previews.
			const isThread = document.body.classList.contains('is_thread');
			const parent = isThread && !isChanX && document.body.querySelector('.board') || document.body;
			Player.container = _.element(Player.templates.body(), parent);

			Player.trigger('rendered');
		} catch (err) {
			Player.logError('There was an error rendering the sound player.', err);
			// Can't recover, throw.
			throw err;
		}
	},

	updateStylesheet: function () {
		// Insert the stylesheet if it doesn't exist. 4chan X polyfill, sound player styling, and user styling.
		Player.stylesheet = Player.stylesheet || _.element('<style id="sound-player-css"></style>', document.head);
		Player.stylesheet.innerHTML = (!isChanX ? '/* 4chanX Polyfill */\n\n' + Player.templates.css4chanXPolyfill() : '')
			+ '\n\n/* Sounds Player CSS */\n\n' + Player.templates.css();
	},

	/**
	 * Change what view is being shown
	 */
	setViewStyle: async function (style) {
		// Get the size and style prior to switching.
		const previousStyle = Player.config.viewStyle;

		// Exit fullscreen before changing to a different view.
		if (style !== 'fullscreen') {
			document.fullscreenElement && document.exitFullscreen();
		}

		// Change the style.
		Player.set('viewStyle', style);
		Player.container.setAttribute('data-view-style', style);

		if (style === 'playlist' || style === 'image') {
			Player.controls.preventWrapping();
		}
		// Try to reapply the pre change sizing unless it was fullscreen.
		if (previousStyle !== 'fullscreen' || style === 'fullscreen') {
			const [ width, height ] = (await GM.getValue('size') || '').split(':');
			width && height && Player.position.resize(parseInt(width, 10), parseInt(height, 10));
			Player.position.setPostWidths();
		}

		Player.trigger('view', style, previousStyle);
	},

	/**
	 * Togle the display status of the player.
	 */
	toggle: function (e) {
		e && e.preventDefault();
		if (Player.container.style.display === 'none') {
			Player.show();
		} else {
			Player.hide();
		}
	},

	/**
	 * Hide the player. Stops polling for changes, and pauses the aduio if set to.
	 */
	hide: function (e) {
		e && e.preventDefault();
		Player.container.style.display = 'none';

		Player.isHidden = true;
		Player.trigger('hide');
	},

	/**
	 * Show the player. Reapplies the saved position/size, and resumes loaded amount polling if it was paused.
	 */
	show: async function (e) {
		e && e.preventDefault();
		if (!Player.container.style.display) {
			return;
		}
		Player.container.style.display = null;

		Player.isHidden = false;
		await Player.trigger('show');
	},

	/**
	 * Stop playback and close the player.
	 */
	close: async function () {
		Player.stop();
		Player.hide();
	},

	/**
	 * Toggle the video/image and controls fullscreen state
	 */
	toggleFullScreen: async function () {
		if (!document.fullscreenElement) {
			// Make sure the player (and fullscreen contents) are visible first.
			if (Player.isHidden) {
				Player.show();
			}
			Player.$(`.${ns}-player`).requestFullscreen();
		} else if (document.exitFullscreen) {
			document.exitFullscreen();
		}
	},

	/**
	 * Handle file/s being dropped on the player.
	 */
	_handleDrop: function (e) {
		e.preventDefault();
		e.stopPropagation();
		Player.playlist.addFromFiles(e.dataTransfer.files);
	},

	/**
	 * Handle the fullscreen state being changed
	 */
	_handleFullScreenChange: function () {
		if (document.fullscreenElement) {
			Player.display.setViewStyle('fullscreen');
			document.querySelector(`.${ns}-image-link`).removeAttribute('href');
		} else {
			if (Player.playing) {
				document.querySelector(`.${ns}-image-link`).href = Player.playing.image;
			}
			Player.playlist.restore();
		}
		Player.controls.preventWrapping();
	},

	_handleRestore: async function (e) {
		e.preventDefault();
		const restore = e.eventTarget.getAttribute('data-restore');
		const restoreIndex = Player.display.dismissed.indexOf(restore);
		if (restore && restoreIndex > -1) {
			Player.display.dismissed.splice(restoreIndex, 1);
			Player.$all(`[data-restore="${restore}"]`).forEach(el => {
				_.elementBefore(dismissedContentCache[restore], el);
				el.parentNode.removeChild(el);
			});
			await GM.setValue('dismissed', Player.display.dismissed.join(','));
		}
	},

	_handleDismiss: async function (e) {
		e.preventDefault();
		const dismiss = e.eventTarget.getAttribute('data-dismiss');
		if (dismiss && !Player.display.dismissed.includes(dismiss)) {
			Player.display.dismissed.push(dismiss);
			Player.$all(`[data-dismiss-id="${dismiss}"]`).forEach(el => {
				_.elementBefore(`<a href="#" class="${ns}-restore-link" data-restore="${dismiss}">${dismissedRestoreCache[dismiss]}</a>`, el);
				el.parentNode.removeChild(el);
			});
			await GM.setValue('dismissed', Player.display.dismissed.join(','));
		}
	},

	ifNotDismissed: function (name, restore, text) {
		dismissedContentCache[name] = text;
		dismissedRestoreCache[name] = restore;
		return Player.display.dismissed.includes(name)
			? `<a href="#" class="${ns}-restore-link" data-restore="${name}">${restore}</a>`
			: text;
	},

	/**
	 * Close any open menus.
	 */
	closeDialogs: function (e) {
		document.querySelectorAll(`.${ns}-menu, .${ns}-colorpicker, .${ns}-theme-save-options`).forEach(menu => {
			// Don't close colorpickers when you click inside them.
			const isClickable = menu.classList.contains(`${ns}-colorpicker`) || menu.classList.contains(`${ns}-theme-save-options`);
			if (!e || !isClickable || !menu.contains(e.target)) {
				menu.parentNode.removeChild(menu);
				Player.trigger('menu-close', menu);
			}
		});
	},

	runTitleMarquee: async function () {
		Player.display._marqueeTO = setTimeout(Player.display.runTitleMarquee, 1000);
		document.querySelectorAll(`.${ns}-title-marquee`).forEach(title => {
			const offset = title.parentNode.getBoundingClientRect().width - (title.scrollWidth + 1);
			const location = title.getAttribute('data-location');
			// Fall out if the title is fully visible.
			if (offset >= 0) {
				return title.style.marginLeft = null;
			}
			const data = Player.display._marquees[location] = Player.display._marquees[location] || {
				direction: 1,
				position: parseInt(title.style.marginLeft, 10) || 0
			};
			// Pause at each end.
			if (data.pause > 0) {
				data.pause--;
				return;
			}
			data.position -= (20 * data.direction);

			// Pause then reverse direction when the end is reached.
			if (data.position > 0 || data.position < offset) {
				data.position = Math.min(0, Math.max(data.position, offset));
				data.direction *= -1;
				data.pause = 1;
			}

			title.style.marginLeft = data.position + 'px';
		});
	}
};
