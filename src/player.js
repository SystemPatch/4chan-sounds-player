const components = {
	// Settings must be first.
	settings: require('./components/settings'),
	colorpicker: require('./components/colorpicker'),
	controls: require('./components/controls'),
	display: require('./components/display'),
	events: require('./components/events'),
	footer: require('./components/footer'),
	header: require('./components/header'),
	hotkeys: require('./components/hotkeys'),
	minimised: require('./components/minimised'),
	playlist: require('./components/playlist'),
	position: require('./components/position'),
	threads: require('./components/threads'),
	tools: require('./components/tools'),
	userTemplate: require('./components/user-template')
};

// Create a global ref to the player.
const Player = window.Player = module.exports = {
	ns,

	audio: new Audio(),
	sounds: [],
	isHidden: true,
	container: null,
	ui: {},
	_public: [],

	// Build the config from the default
	config: {},

	// Helper function to query elements in the player.
	$: (...args) => Player.container && Player.container.querySelector(...args),
	$all: (...args) => Player.container && Player.container.querySelectorAll(...args),

	// Store a ref to the components so they can be iterated.
	components,

	// Get all the templates.
	templates: {
		body: require('./templates/body.tpl'),
		colorpicker: require('./templates/colorpicker.tpl'),
		controls: require('./templates/controls.tpl'),
		css: require('./scss/style.scss'),
		footer: require('./templates/footer.tpl'),
		header: require('./templates/header.tpl'),
		hostInput: require('./templates/host_input.tpl'),
		itemMenu: require('./templates/item_menu.tpl'),
		list: require('./templates/list.tpl'),
		player: require('./templates/player.tpl'),
		settings: require('./templates/settings.tpl'),
		threads: require('./templates/threads.tpl'),
		threadBoards: require('./templates/thread_boards.tpl'),
		threadList: require('./templates/thread_list.tpl'),
		tools: require('./templates/tools.tpl'),
		viewsMenu: require('./templates/views_menu.tpl')
	},

	/**
	 * Set up the player.
	 */
	initialize: async function initialize() {
		if (Player.initialized) {
			return;
		}
		Player.initialized = true;
		try {
			Player.sounds = [ ];
			// Run the initialisation for each component.
			for (let name in components) {
				components[name].initialize && await components[name].initialize();
			}

			if (Site === 'FoolFuuka') {
				// Add a sounds link in the nav for archives
				const nav = document.querySelector('.navbar-inner .nav:nth-child(2)');
				const li = createElement('<li><a href="javascript:;">Sounds</a></li>', nav);
				li.children[0].addEventListener('click', Player.display.toggle);
			} else if (Site === 'Fuuka') {
				const br = document.querySelector('body > div > br');
				br.parentNode.insertBefore(document.createTextNode('['), br);
				createElementBefore('<a href="javascript:;">Sounds</a>', br, { click: Player.display.toggle });
				br.parentNode.insertBefore(document.createTextNode(']'), br);
			} else if (isChanX) {
				// If it's already known that 4chan X is running then setup the button for it.
				Player.display.initChanX();
			} else {
				// Add the [Sounds] link in the top and bottom nav.
				document.querySelectorAll('#settingsWindowLink, #settingsWindowLinkBot').forEach(function (link) {
					createElementBefore('<a href="javascript:;">Sounds</a>', link, { click: Player.display.toggle });
					link.parentNode.insertBefore(document.createTextNode('] ['), link);
				});
			}

			// Expose some functionality via PlayerEvent custom events.
			document.addEventListener('PlayerEvent', e => {
				if (e.detail.action && (MODE === 'development' || Player._public.includes(e.detail.action))) {
					return _get(Player, e.detail.action).apply(window, e.detail.arguments);
				}
			});

			// Render the player, but not neccessarily show it.
			Player.display.render();
		} catch (err) {
			Player.logError('There was an error initialzing the sound player. Please check the console for details.', err);
			// Can't recover so throw this error.
			throw err;
		}
	},

	/**
	 * Compare two ids for sorting.
	 */
	compareIds: function (a, b) {
		const [ aPID, aSID ] = a.split(':');
		const [ bPID, bSID ] = b.split(':');
		const postDiff = aPID - bPID;
		return postDiff !== 0 ? postDiff : aSID - bSID;
	},

	/**
	 * Check whether a sound src and image are allowed and not filtered.
	 */
	acceptedSound: function ({ src, imageMD5 }) {
		try {
			const link = new URL(src);
			const host = link.hostname.toLowerCase();
			return !Player.config.filters.find(v => v === imageMD5 || v === host + link.pathname)
				&& Player.config.allow.find(h => host === h || host.endsWith('.' + h));
		} catch (err) {
			return false;
		}
	},

	/**
	 * Listen for changes
	 */
	syncTab: (property, callback) => typeof GM_addValueChangeListener !== 'undefined' && GM_addValueChangeListener(property, (_prop, oldValue, newValue, remote) => {
		remote && callback(newValue, oldValue);
	}),

	/**
	 * Log errors and show an error notification.
	 */
	logError: function (message, error, type) {
		console.error('[4chan sounds player]', message, error);
		if (error instanceof PlayerError) {
			error.error && console.error('[4chan sound player]', error.error);
			message = error.reason;
			type = error.type || type;
		}
		Player.alert(message, type || 'error', 5);
	},

	/**
	 * Show a notification using 4chan X or the native extention.
	 */
	alert: function (content, type = 'info', lifetime = 5) {
		if (isChanX) {
			content = createElement(`<span>${content}</span`);
			document.dispatchEvent(new CustomEvent('CreateNotification', {
				bubbles: true,
				detail: { content, type, lifetime }
			}));
		} else if (typeof Feedback !== 'undefined') {
			Feedback.showMessage(content, type === 'info' ? 'notify' : 'error', lifetime * 1000);
		}
	}
};

// Add each of the components to the player.
for (let name in components) {
	Player[name] = components[name];
	(Player[name].atRoot || []).forEach(k => Player[k] = Player[name][k]);
	(Player[name].public || []).forEach(k => {
		Player._public.push((Player[name].atRoot || []).includes(k) ? k : `${name}.${k}`);
	});
}
