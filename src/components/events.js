{
	atRoot: [ 'on', 'off', 'trigger' ],

	// Holder of event handlers.
	_events: { },
	_delegatedEvents: { },
	_undelegatedEvents: { },
	_audioEvents: [ ],

	initialize: function () {
		const eventLocations = { Player, ...components };
		const delegated = Player.events._delegatedEvents;
		const undelegated = Player.events._undelegatedEvents;
		const audio = Player.events._audioEvents;

		for (name in eventLocations) {
			const comp = eventLocations[name];
			for (let evt in comp.delegatedEvents || {}) {
				delegated[evt] || (delegated[evt] = [])
				delegated[evt].push(comp.delegatedEvents[evt]);
			}
			for (let evt in comp.undelegatedEvents || {}) {
				undelegated[evt] || (undelegated[evt] = [])
				undelegated[evt].push(comp.undelegatedEvents[evt]);
			}
			comp.audioEvents && (audio.push(comp.audioEvents));
		}
	
		this.on('rendered', function () {
			// Wire up delegated events on the container.
			for (let evt in delegated) {
				Player.container.addEventListener(evt, function (e) {
					for (let eventList of delegated[evt]) {
						for (let selector in eventList) {
							const eventTarget = e.target.closest(selector);
							if (eventTarget) {
								e.eventTarget = eventTarget;
								let handler = Player.events.getHandler(eventList[selector]);
								if (handler) {
									return handler(e);
								}
							}
						}
					}
				});
			}

			// Wire up undelegated events.
			Player.events.wireUpUndelegated();

			// Wire up audio events.
			for (let eventList of audio) {
				for (let evt in eventList) {
					Player.audio.addEventListener(evt, Player.events.getHandler(eventList[evt]));
				}
			}
		});
	},

	/**
	 * Set, or reset, directly bound events.
	 */
	wireUpUndelegated: function () {
		const undelegated = Player.events._undelegatedEvents;
		for (let evt in undelegated) {
			for (let eventList of undelegated[evt]) {
				for (let selector in eventList) {
					document.querySelectorAll(selector).forEach(element => {
						const handler = Player.events.getHandler(eventList[selector]);
						element.removeEventListener(evt, handler);
						element.addEventListener(evt, handler);
					});
				}
			}
		}
	},

	/**
	 * Create an event listener on the player.
	 *
	 * @param {String} evt The name of the events.
	 * @param {function} handler The handler function.
	 */
	on: function (evt, handler) {
		Player.events._events[evt] || (Player.events._events[evt] = []);
		Player.events._events[evt].push(handler);
	},

	/**
	 * Remove an event listener on the player.
	 *
	 * @param {String} evt The name of the events.
	 * @param {function} handler The handler function.
	 */
	off: function (evt, handler) {
		const index = Player.events._events[evt] && Player.events._events[evt].indexOf(handler);
		if (index > -1) {
			Player.events._events[evt].splice(index, 1);
		}
	},

	/**
	 * Trigger an event on the player.
	 *
	 * @param {String} evt The name of the events.
	 * @param {*} data Data passed to the handler.
	 */
	trigger: async function (evt, ...data) {
		const events = Player.events._events[evt] || [];
		for (let handler of events) {
			if (await handler(...data) === false) {
				return;
			}
		}
	},

	/**
	 * Returns the function of Player referenced by name or a given handler function.
	 * @param {String|Function} handler Name to function on Player or a handler function.
	 */
	getHandler: function (handler) {
		return typeof handler === 'string' ? _get(Player, handler) : handler;
	}
}