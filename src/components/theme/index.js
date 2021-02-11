const selectors = require('../../selectors');
const settingsConfig = require('config');

const saveMenuTemplate = require('./templates/save_theme_menu.tpl');

module.exports = {
	public: [ 'switch', 'next', 'previous' ],

	savedThemesTemplate: require('./templates/saved_themes.tpl'),
	themeKeybindsTemplate: require('./templates/theme_keybinds.tpl'),

	delegatedEvents: {
		click: {
			[`.${ns}-save-theme`]: 'theme._save',
			[`.${ns}-toggle-theme-save-fields`]: _.noDefault(() => Player.theme._toggleSaveFields()),
			[`.${ns}-apply-theme`]: _.noDefault(e => Player.theme.switch(e.eventTarget.dataset.theme))
		},
		keyup: {
			[`.${ns}-save-theme-name`]: e => {
				Player.$(`.${ns}-save-theme`).innerHTML = Player.config.savedThemes[e.eventTarget.value] ? 'Update' : 'Create';
			}
		}
	},

	initialize: async function () {
		// Create the user stylesheet and update it when dependent config values are changed.
		Player.theme.render();
		Player.userTemplate.maintain(Player.theme, 'customCSS');
		Player.theme.validateOrder();
	},

	render: function () {
		Player.userStylesheet = Player.userStylesheet || _.element('<style id="sound-player-user-css"></style>', document.head);
		Player.userStylesheet.innerHTML = Player.userTemplate.build({
			template: '/* Sounds Player User CSS */\n\n' + Player.config.customCSS,
			sound: Player.playing,
			ignoreButtons: true,
			ignoreDisplayBlocks: true,
			ignoreSoundName: true,
			ignoreVersion: true
		});
	},

	forceBoardTheme: function () {
		Player.theme.applyBoardTheme({ force: true });
		Player.settings.save();
	},

	/**
	 * Get colors from the board theme.
	 */
	applyBoardTheme: function (opts = {}) {
		// Create a reply element to gather the style from
		const div = _.element(`<div class="${selectors.styleFetcher}"></div>`, document.body);
		const style = document.defaultView.getComputedStyle(div);

		// Make sure the style is loaded.
		// TODO: This sucks. Should observe the stylesheets for changes to make it work.
		// That would also make theme changes apply without a reload.
		if (style.backgroundColor === 'rgba(0, 0, 0, 0)') {
			return setTimeout(Player.display.applyBoardTheme, 0);
		}
		Object.assign(style, { page_background: window.getComputedStyle(document.body).backgroundColor });

		// Apply the computed style to the color config.
		const colorSettingMap = {
			'colors.text': 'color',
			'colors.background': 'backgroundColor',
			'colors.odd_row': 'backgroundColor',
			'colors.border': 'borderBottomColor',
			// If the border is the same color as the text don't use it as a background color.
			'colors.even_row': style.borderBottomColor === style.color ? 'backgroundColor' : 'borderBottomColor',
			// Set this for use in custom css and templates
			'colors.page_background': 'page_background'
		};
		settingsConfig.find(s => s.property === 'colors').settings.forEach(setting => {
			const updateConfig = opts.force || (setting.default === _.get(Player.config, setting.property));
			colorSettingMap[setting.property] && (setting.default = style[colorSettingMap[setting.property]]);
			updateConfig && Player.set(setting.property, setting.default, { bypassSave: true, bypassRender: true, bypassStylesheet: true });
		});

		// Clean up the element.
		document.body.removeChild(div);

		if (!opts.bypassRender) {
			// Updated the stylesheet.
			Player.display.updateStylesheet();
			// Re-render the settings.
			Player.settings.render();
		}
	},

	/**
	 * Switch to the next theme, wrapping round to the beginning.
	 */
	next: function () {
		const order = [ 'Default' ].concat(Player.config.savedThemesOrder);
		const cIndex = order.indexOf(Player.config.selectedTheme);
		const next = order[(cIndex + order.length + 1) % order.length];
		Player.theme.switch(next);
	},

	/**
	 * Switch to the previous theme, wrapping round to the end.
	 */
	previous: function () {
		const order = [ 'Default' ].concat(Player.config.savedThemesOrder);
		const cIndex = order.indexOf(Player.config.selectedTheme);
		const previous = order[(cIndex + order.length - 1) % order.length];
		Player.theme.switch(previous);
	},

	/**
	 * Switch theme.
	 * @param {String} name The name of the theme to switch to.
	 * @param {Object} opts Options passed to player.load
	 */
	switch: function (name) {
		if (name !== 'Default' && !Player.config.savedThemes[name]) {
			return Player.logError(`Theme '${name}' does not exist.`, null, 'warning');
		}
		Player.set('selectedTheme', name);
		if (name === 'Default') {
			[ 'headerTemplate', 'footerTemplate', 'rowTemplate', 'chanXTemplate', 'customCSS' ].forEach(prop => {
				Player.settings.reset(prop, { bypassRender: true, bypassStylesheet: true });
			});
			Player.settings.render();
			Player.display.updateStylesheet();
		} else {
			Player.settings.load(Player.config.savedThemes[name]);
		}
	},

	/**
	 * Make sure the saved themes order contains all and only the saved themes, without duplicates.
	 */
	validateOrder: function () {
		const order = Player.config.savedThemesOrder;
		let _i;
		Player.config.savedThemesOrder = order
			.concat(Object.keys(Player.config.savedThemes))
			.filter((name, i) => Player.config.savedThemes[name] && (_i = order.indexOf(name), _i === -1 || _i === i));
	},

	_parseSwitch: function (newValue, bindings, e) {
		bindings = [ ...bindings ];
		const themeName = e.eventTarget.parentNode.dataset.name;
		if (themeName !== 'Default' && !Player.config.savedThemes[themeName]) {
			Player.logError(`No theme named '${themeName}'.`, null, 'warning');
		}
		const keyDef = Player.hotkeys.parseKey(newValue);
		if (!keyDef.key) {
			bindings = bindings.filter(def => def.themeName !== themeName);
		} else {
			let binding = bindings.find(def => def.themeName === themeName);
			binding || bindings.push(binding = { themeName });
			Object.assign(binding, keyDef);
		}
		return bindings;
	},

	_handleSwitch: function (e) {
		Player.theme.switch(e._binding.themeName);
	},

	_moveUp: (prop, e) => Player.theme._swapOrder(e, -1),
	_moveDown: (prop, e) => Player.theme._swapOrder(e, 1),
	_swapOrder: function (e, dir) {
		const name = e.eventTarget.closest('[data-theme]').dataset.theme;
		const order = Player.config.savedThemesOrder;
		const i = order.indexOf(name);
		if (i + dir >= 0 && i + dir < order.length) {
			[ order[i], order[i + dir] ] = [ order[i + dir], order[i] ];
			Player.$(`[data-theme="${name}"]`).style.order = i + dir;
			Player.$(`[data-theme="${order[i]}"]`).style.order = i;
			Player.settings.set('savedThemes', Player.config.savedThemes, { bypassValidation: true, bypassRender: true });
		}
	},

	_remove: function (prop, e) {
		const themes = Player.config.savedThemes;
		const row = e.eventTarget.closest('[data-theme]');
		const name = row.dataset.theme;
		// Can't delete the default. It's not actually a stored theme.
		if (name === 'Default') {
			return Player.logError('Cannot delete the default theme. You can instead overwrite it.', null, 'warning');
		}
		// For default themes set null so we know to not include them.
		if (Player.settings.findDefault('savedThemes').default[name]) {
			themes[name] = null;
		} else {
			delete themes[name];
		}
		Player.config.savedThemesOrder = Player.config.savedThemesOrder.filter(_name => _name !== name);
		// Remove the row
		row.parentNode.removeChild(row);
		Player.settings.set('savedThemes', themes, { bypassValidation: true, bypassRender: true });
		// Remove hotkey binding
		const bindingIndex = Player.config.hotkey_bindings.switchTheme.find(def => def.themeName === name);
		if (bindingIndex) {
			Player.set('hotkey_bindings.switchTheme', Player.config.hotkey_bindings.switchTheme.splice(bindingIndex, 1), { bypassValidation: true });
		}
	},

	_restoreDefaults: function () {
		Object.assign(Player.config.savedThemes, Player.settings.findDefault('savedThemes').default);
		Player.theme.validateOrder();
		Player.set('savedThemes', Player.config.savedThemes, { bypassValidation: true });
	},

	_showSaveOptions: function (prop, e) {
		e.stopPropagation();
		const open = Player.$(`.${ns}-theme-save-options`);
		if (open) {
			return Player.container.removeChild(open);
		}
		const el = _.element(saveMenuTemplate({ settingsConfig }), Player.container);
		Player.position.showRelativeTo(el, e.eventTarget);
		Player.$(`.${ns}-save-theme-name`).focus();
	},

	_toggleSaveFields: function () {
		Player.$(`.${ns}-theme-save-options`).classList.toggle('fields-collapsed');
		Player.position.showRelativeTo(Player.$(`.${ns}-theme-save-options`), Player.$('[data-handler="theme._showSaveOptions"]'));
	},

	_save: function (e) {
		e.preventDefault();
		const name = Player.$(`.${ns}-save-theme-name`).value;
		if (!name) {
			return Player.logError('A name is required to save a theme.', null, 'warning');
		}
		const checked = Player.$all(`.${ns}-theme-save-options input:checked`);
		const data = [ ...checked ].reduce((data, el) => _.set(data, el.value, _.get(Player.config, el.value)), {});
		Player.config.savedThemes[name] = data;
		Player.config.savedThemesOrder.indexOf(name) === -1 && Player.config.savedThemesOrder.push(name);
		Player.set('savedThemes', Player.config.savedThemes, { bypassValidation: true });
		Player.container.removeChild(Player.$(`.${ns}-theme-save-options`));
	}
};
