module.exports = {
	parseFiles,
	parseFile
}

function parseFiles (target) {
	target.querySelectorAll('.post').forEach(function (post) {
		if (post.parentElement.parentElement.id === 'qp' || post.parentElement.classList.contains('noFile')) {
			return;
		}
		post.querySelectorAll('.file').forEach(function (file) {
			parseFile(file, post);
		});
	});
};

function parseFile(file, post) {
	try {
		if (!file.classList.contains('file')) {
			return;
		}

		const fileLink = isChanX
			? file.querySelector('.fileText .file-info > a')
			: file.querySelector('.fileText > a');

		if (!fileLink) {
			return;
		}

		if (!fileLink.href) {
			return;
		}

		let fileName = null;

		if (isChanX) {
			[
				file.querySelector('.fileText .file-info .fnfull'),
				file.querySelector('.fileText .file-info > a')
			].some(function (node) {
				return node && (fileName = node.textContent);
			});
		} else {
			[
				file.querySelector('.fileText'),
				file.querySelector('.fileText > a')
			].some(function (node) {
				return node && (fileName = node.title || node.tagName === 'A' && node.textContent);
			});
		}

		if (!fileName) {
			return;
		}

		fileName = fileName.replace(/\-/, '/');

		const match = fileName.match(/^(.*)[\[\(\{](?:audio|sound)[ \=\:\|\$](.*?)[\]\)\}]/i);

		if (!match) {
			return;
		}

		const id = post.id.slice(1);
		const name = match[1] || id;
		const fileThumb = post.querySelector('.fileThumb');
		const fullSrc = fileThumb && fileThumb.href;
		const thumbSrc = fileThumb && fileThumb.querySelector('img').src;
		let link = match[2];

		if (link.includes('%')) {
			try {
				link = decodeURIComponent(link);
			} catch (error) {
				return;
			}
		}

		if (link.match(/^(https?\:)?\/\//) === null) {
			link = (location.protocol + '//' + link);
		}

		try {
			link = new URL(link);
		} catch (error) {
			return;
		}

		for (let item of Player.config.allow) {
			if (link.hostname.toLowerCase() === item || link.hostname.toLowerCase().endsWith('.' + item)) {
				return Player.add(name, id, link.href, thumbSrc, fullSrc);
			}
		}
	} catch (err) {
		_logError('There was an issue parsing the files. Please check the console for details.');
		console.log('[4chan sounds player]', post)
		console.error(err);
	}
};
