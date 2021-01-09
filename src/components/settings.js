const settingsConfig = require('config');
const migrations = require('../migrations');

module.exports = {
	atRoot: [ 'set' ],

	changelog: 'https://github.com/rcc11/4chan-sounds-player/releases',

	delegatedEvents: {
		click: {
			[`.${ns}-settings .${ns}-heading-action`]: 'settings._handleAction',
			[`.${ns}-settings-tab`]: 'settings._handleTab',
			[`.${ns}-settings-reset-all`]: _.noDefault(() => Player.settings.load({}, { applyDefault: true, ignore: [ 'viewStyle' ] })),
			[`.${ns}-settings-export`]: 'settings._handleExport',
			[`.${ns}-settings-import`]: 'settings._handleImport',
		},
		focusout: {
			[`.${ns}-settings input, .${ns}-settings textarea`]: 'settings._handleChange'
		},
		change: {
			[`.${ns}-settings input[type=checkbox], .${ns}-settings select`]: 'settings._handleChange'
		},
		keydown: {
			[`.${ns}-key-input`]: 'settings.handleKeyChange',
		}
	},

	initialize: async function () {
		Player.settings.view = 'Display';

		// Apply the default board theme as default.
		Player.display.applyBoardTheme();

		// Load the config.
		await Player.settings.load(await GM.getValue('settings') || {}, {
			applyDefault: true,
			bypassAll: true
		});

		// Show update notifications.
		if (Player.config.showUpdatedNotification && Player.config.VERSION && Player.config.VERSION !== VERSION) {
			Player.alert(`4chan Sounds Player has been updated to <a href="${Player.settings.changelog}" target="_blank">version ${VERSION}</a>.`);
		}

		// Listen for the player closing to apply the pause on hide setting.
		Player.on('hide', function () {
			if (Player.config.pauseOnHide) {
				Player.pause();
			}
		});

		// Listen for changes from other tabs
		Player.syncTab('settings', value => Player.settings.load(value, {
			bypassSave: true,
			applyDefault: true,
			ignore: [ 'viewStyle' ]
		}));
	},

	render: function () {
		if (Player.container) {
			Player.$(`.${ns}-settings`).innerHTML = Player.templates.settings();
		}
	},

	/**
	 * Update a setting.
	 */
	set: function (property, value, { bypassAll, bypassValidation, bypassSave, bypassRender, silent, bypassStylesheet, settingConfig } = {}) {
		settingConfig = settingConfig || Player.settings.findDefault(property);
		const previous = _.get(Player.config, property);

		// Check if the value has actually changed.
		if (!bypassValidation && _.isEqual(previous, value)) {
			return;
		}

		// Set the new value.
		_.set(Player.config, property, value);

		// Trigger events, unless they are disabled in opts.
		if (!bypassAll) {
			!bypassStylesheet && settingConfig && settingConfig.updateStylesheet && Player.display.updateStylesheet();
			!silent && Player.trigger('config', property, value, previous);
			!silent && Player.trigger('config:' + property, value, previous);
			!bypassSave && Player.settings.save();
			!bypassRender && settingConfig.displayGroup && Player.settings.render();
		}
		return [ previous, value ];
	},

	/**
	 * Reset a setting to the default value
	 */
	reset: function (property) {
		let settingConfig = Player.settings.findDefault(property);
		Player.set(property, settingConfig.default, { settingConfig });
	},

	/**
	 * Load a configuration object.
	 *
	 * @param {Object} settings Config to load
	 * @param {Object} opts Same as Player.set, and applyDefault to reset defaults instead mixing current values.
	 */
	load: async function (settings, opts = {}) {
		if (typeof settings === 'string') {
			settings = JSON.parse(settings);
		}
		const changes = {};
		settingsConfig.forEach(function _handleSetting(setting) {
			if (setting.settings) {
				return setting.settings.forEach(subSetting => _handleSetting({
					property: setting.property,
					default: setting.default,
					...subSetting
				}));
			}
			if (opts.ignore && opts.ignore.includes(setting.property)) {
				return;
			}
			let value = _.get(settings, setting.property, opts.applyDefault ? setting.default : undefined);
			if (value !== undefined) {
				// Mix in default.
				setting.mix && (value = { ...setting.default, ...(value || {}) });
				const data = Player.set(setting.property, value, { bypassAll: true, settingConfig: setting });
				data && (changes[setting.property] = data);
			}
		});
		// Run any migrations to get up to date, and update the stored changes for event triggering.
		Object.entries(await Player.settings.migrate(settings.VERSION)).forEach(([ prop, [ current, previous ] ]) => {
			changes[prop] = [ current, changes[prop] ? changes[prop][1] : previous ]
		});
		// Finally, trigger events.
		if (!opts.bypassAll) {
			!opts.bypassStylesheet && Player.display.updateStylesheet();
			console.log(changes);
			!opts.silent && Object.entries(changes).forEach(([ prop, [ current, previous ] ]) => {
				Player.trigger('config', prop, current, previous);
				Player.trigger('config:' + prop, current, previous);
			});
			!opts.bypassSave && Player.settings.save();
			!opts.bypassRender && Player.settings.render();
		}
	},

	/**
	 * Persist the player settings.
	 */
	save: function () {
		try {
			// Filter settings that haven't been modified from the default.
			const settings = settingsConfig.reduce(function _handleSetting(settings, setting) {
				if (setting.settings) {
					setting.settings.forEach(subSetting => _handleSetting(settings, {
						property: setting.property,
						default: setting.default,
						...subSetting
					}));
				} else {
					let userVal = _.get(Player.config, setting.property);
					if (userVal !== undefined && !_.isEqual(userVal, setting.default)) {
						// If the setting is a mixed in object only store items that differ from the default.
						if (setting.mix) {
							userVal = Object.keys(userVal).reduce((changed, key) => {
								if (!_.isEqual(setting.default[key], userVal[key])) {
									changed[key] = userVal[key];
								}
								return changed;
							}, {});
						}
						_.set(settings, setting.property, userVal);
					}
				}
				return settings;
			}, {});
			// Show the playlist or image view on load, whichever was last shown.
			settings.viewStyle = Player.playlist._lastView;
			// Store the player version with the settings.
			settings.VERSION = VERSION;
			// Save the settings.
			return GM.setValue('settings', JSON.stringify(settings));
		} catch (err) {
			Player.logError('There was an error saving the sound player settings.', err);
		}
	},

	/**
	 * Run migrations when the player is updated.
	 */
	migrate: async function (fromVersion) {
		// Fall out if the player hasn't updated.
		if (!fromVersion || fromVersion === VERSION) {
			return {};
		}
		const changes = {};
		for (let i = 0; i < migrations.length; i++) {
			let mig = migrations[i];
			if (Player.settings.compareVersions(fromVersion, mig.version) < 0) {
				try {
					console.log('[4chan sound player] Migrate:', mig.name);
					Object.entries(await mig.run()).forEach(([ prop, [ current, previous ] ]) => {
						changes[prop] = [ current, changes[prop] ? changes[prop][1] : previous ]
					});
				} catch (err) {
					console.error(err);
				}
			}
		}
		return changes;
	},

	/**
	 * Compare two semver strings.
	 */
	compareVersions: function (a, b) {
		const [ aVer, aHash ] = a.split('-');
		const [ bVer, bHash ] = b.split('-');
		const aParts = aVer.split('.');
		const bParts = bVer.split('.');
		for (let i = 0; i < 3; i++) {
			if (+aParts[i] > +bParts[i]) {
				return 1;
			}
			if (+aParts[i] < +bParts[i]) {
				return -1;
			}
		}
		return aHash !== bHash;
	},

	/**
	 * Find a setting in the default configuration.
	 */
	findDefault: function (property) {
		let settingConfig;
		settingsConfig.find(function (setting) {
			if (setting.property === property) {
				return settingConfig = setting;
			}
			if (setting.settings) {
				let subSetting = setting.settings.find(_setting => _setting.property === property);
				return subSetting && (settingConfig = { ...setting, settings: null, ...subSetting });
			}
			return false;
		});
		return settingConfig || { property };
	},

	/**
	 * Toggle whether the player or settings are displayed.
	 */
	toggle: function (group) {
		// Blur anything focused so the change is applied.
		let focused = Player.$(`.${ns}-settings :focus`);
		focused && focused.blur();

		// Restore the playlist if there's no group given and the settings are already open.
		if (!group && Player.config.viewStyle === 'settings') {
			return Player.playlist.restore();
		}
		// Switch to the settings view if it's not already showing.
		if (Player.config.viewStyle !== 'settings') {
			Player.display.setViewStyle('settings');
		}
		// Switch to a given group.
		if (group && group !== Player.settings.view) {
			Player.settings.showGroup(group);
		}
	},

	/**
	 * Switch the displayed group
	 */
	_handleTab: function (e) {
		const group = e.eventTarget.getAttribute('data-group');
		if (group) {
			e.preventDefault();
			Player.settings.showGroup(group);
		}
	},

	showGroup: function (group) {
		Player.settings.view = group;
		const currentGroup = Player.$(`.${ns}-settings-group.active`);
		const currentTab = Player.$(`.${ns}-settings-tab.active`);
		currentGroup && currentGroup.classList.remove('active');
		currentTab && currentTab.classList.remove('active');
		Player.$(`.${ns}-settings-group[data-group="${group}"]`).classList.add('active');
		Player.$(`.${ns}-settings-tab[data-group="${group}"]`).classList.add('active');
	},

	_handleImport: async function (e) {
		e.preventDefault();
		const fileInput = _.element('<input type="file">');
		const _import = async e => {
			let config;
			try {
				config = await (await fetch(URL.createObjectURL(fileInput.files[0]))).json();
			} catch (err) {
				Player.logError(`Expected a JSON config file and got ${fileInput.files[0].type}.`, err, 'warning');
			}
			fileInput.removeEventListener('change', _import);
			Player.settings.load(config);
		};
		fileInput.addEventListener('change', _import);
		fileInput.click();
	},

	_handleExport: async function (e) {
		e.preventDefault();
		// Use the saved settings to only export non-default user settings. Shift click exports everything for testing.
		const settings = e.shiftKey ? JSON.stringify(Player.config, null, 4) : await GM.getValue('settings') || '{}';
		const blob = new Blob([ settings ], { type: 'application/json' });
		const a = _.element(`<a href="${URL.createObjectURL(blob)}" download="4chan-sp-config.json" rel="noopener" target="_blank"></a>`);
		a.click();
		URL.revokeObjectURL(a.href);
	},

	/**
	 * Handle the user making a change in the settings view.
	 */
	_handleChange: function (e) {
		try {
			const input = e.eventTarget;
			const property = input.getAttribute('data-property');
			if (!property) {
				return;
			}
			let settingConfig = Player.settings.findDefault(property);

			// Get the new value of the setting.
			const currentValue = _.get(Player.config, property);
			let newValue = input[input.getAttribute('type') === 'checkbox' ? 'checked' : 'value'];

			if (settingConfig.parse) {
				newValue = Player.getHandler(settingConfig.parse)(newValue, currentValue, e);
			}
			if (settingConfig && settingConfig.split) {
				newValue = newValue.split(decodeURIComponent(settingConfig.split));
			}

			// Not the most stringent check but enough to avoid some spamming.
			if (!_.isEqual(currentValue, newValue, !settingConfig.looseCompare)) {
				// Update the setting.
				Player.set(property, newValue, { bypassValidation: true, bypassRender: true, settingConfig });
			}
		} catch (err) {
			Player.logError('There was an error updating the setting.', err);
		}
	},

	/**
	 * Converts a key event in an input to a string representation set as the input value.
	 */
	handleKeyChange: function (e) {
		e.preventDefault();
		if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta') {
			return;
		}
		e.eventTarget.value = Player.hotkeys.stringifyKey(e);
	},

	/**
	 * Handle an action link next to a heading being clicked.
	 */
	_handleAction: function (e) {
		e.preventDefault();
		const property = e.eventTarget.getAttribute('data-property');
		const handlerName = e.eventTarget.getAttribute('data-handler');
		const handler = _.get(Player, handlerName);
		handler && handler(property, e);
	},

	renderHosts: function (_value) {
		return `<div class="${ns}-host-inputs">`
			+ Object.keys(Player.config.uploadHosts).map(Player.templates.hostInput).join('')
		+ '</div>';
	},

	parseHosts: function (newValue, hosts, e) {
		hosts = { ...hosts };
		const container = e.eventTarget.closest(`.${ns}-host-input`);
		let name = container.getAttribute('data-host-name');
		let host = hosts[name] = { ...hosts[name] };
		const changedField = e.eventTarget.getAttribute('name');

		try {
			// If the name was changed then reassign in hosts and update the data-host-name attribute.
			if (changedField === 'name' && newValue !== name) {
				if (!newValue || hosts[newValue]) {
					throw new PlayerError('A unique name for the host is required.', 'warning');
				}
				container.setAttribute('data-host-name', newValue);
				hosts[newValue] = host;
				delete hosts[name];
				name = newValue;
			}

			// Validate URL
			if (changedField === 'url' || changedField === 'soundUrl') {
				try {
					(changedField === 'url' || newValue) && new URL(newValue);
				} catch (err) {
					throw new PlayerError('The value must be a valid URL.', 'warning');
				}
			}

			// Parse the data
			if (changedField === 'data') {
				try {
					newValue = JSON.parse(newValue);
				} catch (err) {
					throw new PlayerError('The data must be valid JSON.', 'warning');
				}
			}

			if (changedField === 'headers') {
				try {
					newValue = newValue ? JSON.parse(newValue) : undefined;
				} catch (err) {
					throw new PlayerError('The headers must be valid JSON.', 'warning');
				}
			}
		} catch (err) {
			host.invalid = true;
			container.classList.add('invalid');
			throw err;
		}

		if (newValue === undefined) {
			delete host[changedField];
		} else {
			host[changedField] = newValue;
		}

		try {
			const soundUrlValue = container.querySelector('[name=soundUrl]').value;
			const headersValue = container.querySelector('[name=headers]').value;
			if (name
				&& JSON.parse(container.querySelector('[name=data]').value)
				&& new URL(container.querySelector('[name=url]').value)
				&& (!soundUrlValue || new URL(soundUrlValue))
				&& (!headersValue || JSON.parse(headersValue))) {

				delete host.invalid;
				container.classList.remove('invalid');
			}
		} catch (err) {
			// leave it invalid
		}

		return hosts;
	},

	addUploadHost: function () {
		const hosts = Player.config.uploadHosts;
		const container = Player.$(`.${ns}-host-inputs`);
		let name = 'New Host';
		let i = 1;
		while (Player.config.uploadHosts[name]) {
			name = name + ' ' + ++i;
		}
		hosts[name] = { invalid: true, data: { file: '$file' } };
		if (container.children[0]) {
			_.elementBefore(Player.templates.hostInput(name), container.children[0]);
		} else {
			_.element(Player.templates.hostInput(name), container);
		}
		Player.settings.set('uploadHosts', hosts, { bypassValidation: true, bypassRender: true, silent: true });
	},

	removeHost: function (prop, e) {
		const hosts = Player.config.uploadHosts;
		const container = e.eventTarget.closest(`.${ns}-host-input`);
		const name = container.getAttribute('data-host-name');
		// For hosts in the defaults set null so we know to not include them on load
		if (Player.settings.findDefault('uploadHosts').default[name]) {
			hosts[name] = null;
		} else {
			delete hosts[name];
		}
		container.parentNode.removeChild(container);
		Player.settings.set('uploadHosts', hosts, { bypassValidation: true, bypassRender: true });
	},

	setDefaultHost: function (_new, _current, e) {
		const selected = e.eventTarget.closest(`.${ns}-host-input`).getAttribute('data-host-name');
		if (selected === Player.config.defaultUploadHost) {
			return selected;
		}

		Object.keys(Player.config.uploadHosts).forEach(name => {
			const checkbox = Player.$(`.${ns}-host-input[data-host-name="${name}"] input[data-property="defaultUploadHost"]`);
			checkbox && (checkbox.checked = name === selected);
		});
		return selected;
	},

	restoreDefaultHosts: function () {
		Object.assign(Player.config.uploadHosts, Player.settings.findDefault('uploadHosts').default);
		Player.set('uploadHosts', Player.config.uploadHosts, { bypassValidation: true });
	}
};
