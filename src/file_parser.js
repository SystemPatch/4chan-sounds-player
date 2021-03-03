const selectors = require('./selectors');

const protocolRE = /^(https?:)?\/\//;
const filenameRE = /(.*?)[[({](?:audio|sound)[ =:|$](.*?)[\])}]/gi;

let localCounter = 0;

module.exports = {
	parseFiles,
	parsePost,
	parseFileName
};

function parseFiles(target, postRender) {
	let addedSounds = false;
	let posts = target.classList.contains('post')
		? [ target ]
		: target.querySelectorAll(selectors.posts);

	posts.forEach(post => parsePost(post, postRender) && (addedSounds = true));

	if (addedSounds && postRender && Player.container) {
		Player.playlist.render();
	}
}

function parsePost(post, skipRender) {
	try {
		// Ignore the style fetcher post created by this script, quoted posts, and posts with no file.
		let parent = post.parentElement;
		let parentParent = parent && parent.parentElement;
		if (post.classList.contains('style-fetcher') || parentParent && parentParent.id === 'qp' || parent && parent.classList.contains('noFile')) {
			return;
		}

		// If there's a play button this post has already been parsed. Just wire up the link.
		let playLink = post.querySelector(`.${ns}-play-link`);
		if (playLink) {
			const id = playLink.getAttribute('data-id');
			playLink.onclick = () => Player.play(Player.sounds.find(sound => sound.id === id));
			return;
		}

		let filename = null;
		let filenameLocations = selectors.filename;

		Object.keys(filenameLocations).some(function (selector) {
			const node = post.querySelector(selector);
			return node && (filename = node[filenameLocations[selector]]);
		});

		if (!filename) {
			return;
		}

		selectors.filenameParser && (filename = selectors.filenameParser(filename));

		const postID = post.id.slice(selectors.postIdPrefix.length);
		const fileThumb = post.querySelector(selectors.thumb).closest('a');
		const imageSrc = fileThumb && fileThumb.href;
		const thumbImg = fileThumb && fileThumb.querySelector('img');
		const thumbSrc = thumbImg && thumbImg.src;
		const imageMD5 = Site === 'Fuuka'
			? post.querySelector(':scope > a:nth-of-type(3)').href.split('/').pop()
			: thumbImg && thumbImg.getAttribute('data-md5');

		const sounds = parseFileName(filename, imageSrc, postID, thumbSrc, imageMD5);

		if (!sounds.length) {
			return;
		}

		// Create a play link
		const firstID = sounds[0].id;
		const linkInfo = selectors.playLink;
		const content = `<a href="javascript:;" class="${linkInfo.class}" data-id="${firstID}">${linkInfo.text || ''}</a>`;

		const relative = linkInfo.relative && post.querySelector(linkInfo.relative);
		const position = linkInfo.position;

		const prepended = linkInfo.prependText && _.elementRelativeTo(document.createTextNode(linkInfo.prependText), relative, position);
		playLink = prepended
			? _.elementRelativeTo(content, prepended, 'after')
			: _.elementRelativeTo(content, relative, position);
		linkInfo.appendText && _.elementRelativeTo(document.createTextNode(linkInfo.appendText), playLink, 'after');
		playLink.onclick = () => Player.play(sounds[0]);

		// Don't add sounds from inline quotes of posts in the thread
		sounds.forEach(sound => Player.add(sound, skipRender));
		return sounds.length > 0;
	} catch (err) {
		Player.logError('There was an issue parsing the files. Please check the console for details.', err);
		console.log('[4chan sounds player]', post);
	}
}


function parseFileName(filename, image, post, thumb, imageMD5, bypassVerification) {
	if (!filename) {
		return [];
	}
	// Best quality image. For webms this has to be the thumbnail still. SAD!
	const imageOrThumb = image.endsWith('webm') ? thumb : image;
	const matches = [];
	let match;
	while ((match = filenameRE.exec(filename)) !== null) {
		matches.push(match);
	}
	// Add webms without a sound filename as a standable video if enabled
	if (!matches.length && (Player.config.addWebm === 'always' || (Player.config.addWebm === 'soundBoards' && (Board === 'gif' || Board === 'wsg'))) && filename.endsWith('.webm')) {
		matches.push([ null, filename.slice(0, -5), image ]);
	}
	const defaultName = matches[0] && matches[0][1] || post || 'Local Sound ' + localCounter;
	matches.length && !post && localCounter++;

	return matches.reduce((sounds, match, i) => {
		let src = match[2];
		const id = (post || 'local' + localCounter) + ':' + i;
		const name = match[1].trim();
		const title = name || defaultName + (matches.length > 1 ? ` (${i + 1})` : '');
		const standaloneVideo = src === image;

		try {
			if (src.includes('%')) {
				src = decodeURIComponent(src);
			}

			if (!src.startsWith('blob:') && src.match(protocolRE) === null) {
				src = (location.protocol + '//' + src);
			}
		} catch (error) {
			return sounds;
		}

		const sound = { src, id, title, name, post, image, imageOrThumb, filename, thumb, imageMD5, standaloneVideo };
		if (bypassVerification || Player.acceptedSound(sound)) {
			sounds.push(sound);
		}
		return sounds;
	}, []);
}
