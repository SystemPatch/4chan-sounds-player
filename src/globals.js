/**
 * Global variables and helpers.
 */

window.ns = 'fc-sounds';

window.is4chan = location.hostname.includes('4chan.org') || location.hostname.includes('4channel.org');
window.isChanX = document.documentElement && document.documentElement.classList.contains('fourchan-x');
window.Board = location.pathname.split('/')[1];

// Determine what type of site this is. Default to FoolFuuka as the most common archiver.
window.Site = is4chan ? '4chan'
	: ((document.head.querySelector('meta[name="generator"]') || {}).content || '').includes('FoolFuuka') ? 'FoolFuuka'
	: ((document.head.querySelector('meta[name="description"]') || {}).content || '').includes('Fuuka') ? 'Fuuka'
	: 'FoolFuuka';

window._set = function (object, path, value) {
	const props = path.split('.');
	const lastProp = props.pop();
	const setOn = props.reduce((obj, k) => obj[k] || (obj[k] = {}), object);
	setOn && (setOn[lastProp] = value);
	return object;
};

window._get = function (object, path, dflt) {
	if (typeof path !== 'string') {
		return dflt;
	}
	const props = path.split('.');
	const lastProp = props.pop();
	const parent = props.reduce((obj, k) => obj && obj[k], object);
	return parent && Object.prototype.hasOwnProperty.call(parent, lastProp)
		? parent[lastProp]
		: dflt;
};

/**
 * Check two values are equal. Arrays/Objects are deep checked.
 */
window._isEqual = function (a, b, strict = true) {
	if (typeof a !== typeof b) {
		return false;
	}
	if (Array.isArray(a, b)) {
		return a === b || a.length === b.length && a.every((_a, i) => _isEqual(_a, b[i]));
	}
	if (a && b && typeof a === 'object' && a !== b) {
		const allKeys = Object.keys(a);
		allKeys.push(...Object.keys(b).filter(k => !allKeys.includes(k)));
		return allKeys.every(key => _isEqual(a[key], b[key]));
	}
	// eslint-disable-next-line eqeqeq
	return strict ? a === b : a == b;
};

window.toDuration = function (number) {
	number = Math.floor(number || 0);
	let [ seconds, minutes, hours ] = _duration(0, number);
	seconds < 10 && (seconds = '0' + seconds);
	return (hours ? hours + ':' : '') + minutes + ':' + seconds;
};

window.timeAgo = function (date) {
	const [ seconds, minutes, hours, days, weeks ] = _duration(Math.floor(date), Math.floor(Date.now() / 1000));
	/* _eslint-disable indent */
	return weeks > 1 ? weeks + ' weeks ago'
		: days > 0 ? days + (days === 1 ? ' day' : ' days') + ' ago'
		: hours > 0 ? hours + (hours === 1 ? ' hour' : ' hours') + ' ago'
		: minutes > 0 ? minutes + (minutes === 1 ? ' minute' : ' minutes') + ' ago'
		: seconds + (seconds === 1 ? ' second' : ' seconds') + ' ago';
	/* eslint-enable indent */
};

function _duration(from, to) {
	const diff = Math.max(0, to - from);
	return [
		diff % 60,
		Math.floor(diff / 60) % 60,
		Math.floor(diff / 60 / 60) % 24,
		Math.floor(diff / 60 / 60 / 24) % 7,
		Math.floor(diff / 60 / 60 / 24 / 7)
	];
}

window.createElement = function (html, parent, events = {}) {
	const container = document.createElement('div');
	container.innerHTML = html;
	const el = container.children[0];
	parent && parent.appendChild(el);
	for (let event in events) {
		el.addEventListener(event, events[event]);
	}
	return el;
};

window.createElementBefore = function (html, before, events = {}) {
	const el = createElement(html, null, events);
	before.parentNode.insertBefore(el, before);
	return el;
};

window.noDefault = (f, ...args) => e => {
	e.preventDefault();
	const func = typeof f === 'function' ? f : _get(Player, f);
	func(e, ...args);
};

class PlayerError extends Error {
	constructor(msg, type, err) {
		super(msg);
		this.reason = msg;
		this.type = type;
		this.error = err;
	}
}
window.PlayerError = PlayerError;
