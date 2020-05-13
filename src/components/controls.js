module.exports = {
	atRoot: [ 'togglePlay', 'play', 'pause', 'next', 'previous' ],

	delegatedEvents: {
		click: {
			[`.${ns}-previous-button`]: () => Player.previous(),
			[`.${ns}-play-button`]: 'togglePlay',
			[`.${ns}-next-button`]: () => Player.next(),
			[`.${ns}-seek-bar`]: 'controls.handleSeek',
			[`.${ns}-volume-bar`]: 'controls.handleVolume',
		},
		mousedown: {
			[`.${ns}-seek-bar`]: () => Player._seekBarDown = true,
			[`.${ns}-volume-bar`]: () => Player._volumeBarDown = true
		},
		mousemove: {
			[`.${ns}-seek-bar`]: e => Player._seekBarDown && Player.controls.handleSeek(e),
			[`.${ns}-volume-bar`]: e => Player._volumeBarDown && Player.controls.handleVolume(e)
		}
	},

	undelegatedEvents: {
		mouseleave: {
			[`.${ns}-seek-bar`]: e => Player._seekBarDown && Player.controls.handleSeek(e),
			[`.${ns}-volume-bar`]: e => Player._volumeBarDown && Player.controls.handleVolume(e)
		},
		mouseup: {
			body: () => {
				Player._seekBarDown = false;
				Player._volumeBarDown = false;
			}
		},
		play: { [`.${ns}-video`]: 'controls.syncVideo' },
		playing: { [`.${ns}-video`]: 'controls.syncVideo' },
		pause: { [`.${ns}-video`]: 'controls.syncVideo' },
		loadeddata: { [`.${ns}-video`]: 'controls.syncVideo' }
	},

	audioEvents: {
		ended: () => Player.next(),
		pause: 'controls.handleAudioEvent',
		play: 'controls.handleAudioEvent',
		seeked: 'controls.handleAudioEvent',
		waiting: 'controls.handleAudioEvent',
		timeupdate: 'controls.updateDuration',
		loadedmetadata: 'controls.updateDuration',
		durationchange: 'controls.updateDuration',
		volumechange: 'controls.updateVolume',
		loadstart: 'controls.pollForLoading'
	},

	/**
	 * Switching being playing and paused.
	 */
	togglePlay: function () {
		if (Player.audio.paused) {
			Player.play();
		} else {
			Player.pause();
		}
	},

	/**
	 * Start playback.
	 */
	play: function (sound) {
		if (!Player.audio) {
			return;
		}

		try {
			// If nothing is currently selected to play start playing the first sound.
			if (!sound && !Player.playing && Player.playOrder.length) {
				sound = Player.playOrder[0];
			}
			// If a new sound is being played update the display.
			if (sound) {
				if (Player.playing) {
					Player.playing.playing = false;
				}
				sound.playing = true;
				Player.playing = sound;
				Player.header.render();
				Player.audio.src = sound.src;
				Player.playlist.showImage(sound);
				Player.playlist.render();
			}
			Player.audio.play();
		} catch (err) {
			_logError('There was an error playing the sound. Please check the console for details.');
			console.error('[4chan sounds player]', err);
		}
	},

	/**
	 * Pause playback.
	 */
	pause: function (force) {
		Player.audio && Player.audio.pause();
	},

	/**
	 * Play the next sound.
	 */
	next: function (force) {
		Player.controls._movePlaying(1, force);
	},

	/**
	 * Play the previous sound.
	 */
	previous: function (force) {
		Player.controls._movePlaying(-1, force);
	},

	_movePlaying: function (direction, force) {
		if (!Player.audio) {
			return;
		}
		try {
			// If there's no sound fall out.
			if (!Player.playOrder.length) {
				return;
			}
			// If there's no sound currently playing or it's not in the list then just play the first sound.
			const currentIndex = Player.playOrder.indexOf(Player.playing);
			if (currentIndex === -1) {
				return Player.play(Player.playOrder[0]);
			}
			// Get the next index, either repeating the same, wrapping round to repeat all or just moving the index.
			const nextIndex = !force && Player.config.repeat === 'one'
				? currentIndex
				: Player.config.repeat === 'all'
					? ((currentIndex + direction) + Player.playOrder.length) % Player.playOrder.length
					: currentIndex + direction;
			const nextSound = Player.playOrder[nextIndex];
			nextSound && Player.play(nextSound);
		} catch (err) {
			_logError(`There was an error selecting the ${direction > 0 ? 'next': 'previous'} track. Please check the console for details.`);
			console.error('[4chan sounds player]', err);
		}
	},

	/**
	 * Handle audio events. Sync the video up, and update the controls.
	 */
	handleAudioEvent: function () {
		Player.controls.syncVideo();
		Player.controls.updateDuration();
		Player.$(`.${ns}-play-button .${ns}-play-button-display`).classList[Player.audio.paused ? 'add' : 'remove'](`${ns}-play`);
	},

	/**
	 * Sync the webm to the audio. Matches the videos time and play state to the audios.
	 */
	syncVideo: function () {
		if (Player.playlist.isVideo) {
			const paused = Player.audio.paused;
			const video = Player.$(`.${ns}-video`);
			if (video) {
				if (paused) {
					video.currentTime = Math.min(Player.audio.currentTime, video.duration);
					video.pause();
				} else if (Player.audio.currentTime < video.duration) {
					video.currentTime = Player.audio.currentTime;
					video.play();
				}
			}
		}
	},

	/**
	 * Poll for how much has loaded. I know there's the progress event but it unreliable.
	 */
	pollForLoading: function () {
		Player._loadingPoll = Player._loadingPoll || setInterval(Player.controls.updateLoaded, 1000);
	},

	/**
	 * Stop polling for how much has loaded.
	 */
	stopPollingForLoading: function () {
		Player._loadingPoll && clearInterval(Player._loadingPoll);
		Player._loadingPoll = null;
	},

	/**
	 * Update the loading bar.
	 */
	updateLoaded: function () {
		const length = Player.audio.buffered.length;
		const size = length > 0
			? (Player.audio.buffered.end(length - 1) / Player.audio.duration) * 100
			: 0;
		// If it's fully loaded then stop polling.
		size === 100 && Player.controls.stopPollingForLoading();
		Player.ui.loadedBar.style.width = size + '%';
	},

	/**
	 * Update the seek bar and the duration labels.
	 */
	updateDuration: function () {
		if (!Player.container) {
			return;
		}
		Player.ui.currentTime.innerHTML = toDuration(Player.audio.currentTime);
		Player.ui.duration.innerHTML = ' / ' + toDuration(Player.audio.duration);
		Player.controls.updateProgressBarPosition(`.${ns}-seek-bar`, Player.ui.currentTimeBar, Player.audio.currentTime, Player.audio.duration);
	},

	/**
	 * Update the volume bar.
	 */
	updateVolume: function () {
		Player.controls.updateProgressBarPosition(`.${ns}-volume-bar`, Player.$(`.${ns}-volume-bar .${ns}-current-bar`), Player.audio.volume, 1);
	},

	/**
	 * Update a progress bar width. Adjust the margin of the circle so it's contained within the bar at both ends.
	 */
	updateProgressBarPosition: function (id, bar, current, total) {
		current || (current = 0);
		total || (total = 0);
		const ratio = !total ? 0 : Math.max(0, Math.min(((current || 0) / total), 1));
		bar.style.width = (ratio * 100) + '%';
		if (Player._progressBarStyleSheets[id]) {
			Player._progressBarStyleSheets[id].innerHTML = `${id} .${ns}-current-bar:after {
				margin-right: ${-.8 * (1 - ratio)}rem;
			}`;
		}
	},

	/**
	 * Handle the user interacting with the seek bar.
	 */
	handleSeek: function (e) {
		e.preventDefault();
		if (Player.container && Player.audio.duration && Player.audio.duration !== Infinity) {
			const ratio = e.offsetX / parseInt(document.defaultView.getComputedStyle(e.eventTarget || e.target).width, 10);
			Player.audio.currentTime = Player.audio.duration * ratio;
		}
	},

	/**
	 * Handle the user interacting with the volume bar.
	 */
	handleVolume: function (e) {
		e.preventDefault();
		if (!Player.container) {
			return;
		}
		const ratio = e.offsetX / parseInt(document.defaultView.getComputedStyle(e.eventTarget || e.target).width, 10);
		Player.audio.volume = Math.max(0, Math.min(ratio, 1));
		Player.controls.updateVolume();
	}
}
