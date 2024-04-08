'use strict';

async function doInit() {
	// Require globals again here just in case 4chan X loaded before timeout below.
	require('./globals');

	// Require these here so every other require is sure of the 4chan X state.
	const Player = require('./player');

	await Player.initialize();

	Player.posts.addPosts(document.body, true);

	const observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						Player.posts.addPosts(node);
					}
				});
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
	
	if (isOneechan) {
		waitingForOneechan();
	}
}

function waitingForOneechan () {
	if(!document.querySelector('#OneeChanLink')) {
		window.setTimeout(waitingForOneechan,50);
	} else {
		Player.theme.applyBoardTheme();
	}
}

document.addEventListener('4chanXInitFinished', doInit);

// The timeout makes sure 4chan X will have added it's classes and be identified.
setTimeout(function () {
	require('./globals');

	// If it's already known 4chan X is installed this can be skipped.
	if (!isChanX) {
		if (document.readyState !== 'loading') {
			doInit();
		} else {
			document.addEventListener('DOMContentLoaded', doInit);
		}
	}
}, 0);

