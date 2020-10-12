const HEIGHT = 200;
const WIDTH = 200;

module.exports = {
	delegatedEvents: {
		click: {
			[`.${ns}-colorpicker-input, .${ns}-cp-preview`]: 'colorpicker.create',
			[`.${ns}-apply-colorpicker`]: 'colorpicker._applyColorPicker',
			[`.${ns}-close-colorpicker`]: noDefault(() => Player.display.closeDialogs())
		},
		change: {
			[`.${ns}-rgb-input`]: 'colorpicker._handleRGBInput',
		},
		focusout: {
			[`.${ns}-colorpicker-input`]: 'colorpicker._updatePreview'
		},
		mousedown: {
			[`.${ns}-cp-saturation, .${ns}-cp-hue`]: e => {
				const target = e.eventTarget;
				target._mousedown = true;
				document.documentElement.addEventListener('mouseup', _e => delete target._mousedown, { once: true });
				Player.colorpicker[`_handle${e.eventTarget.classList.contains(`${ns}-cp-hue`) ? 'Hue' : 'Saturation'}Move`](e);
			}
		},
		mousemove: {
			[`.${ns}-cp-hue`]: 'colorpicker._handleHueMove',
			[`.${ns}-cp-saturation`]: 'colorpicker._handleSaturationMove'
		}
	},

	initialize: function () {
		Player.on('menu-close', menu => menu._input && (delete menu._input._colorpicker));
	},

	create: function (e) {
		e.preventDefault();
		e.stopPropagation();

		const input = e.eventTarget.nodeName === 'INPUT'
			? e.eventTarget
			: e.eventTarget.parentNode.querySelector('input');
		if (!input || input._colorpicker) {
			return;
		}

		Player.display.closeDialogs();
		
		// See if the input has a hex or rgb value and get it as [ r, g, b ] in the range 0 - 255.
		let hexMatch, rgbMatch, rgb = [ 255, 0, 0 ];
		if (hexMatch = input.value.match(/#([0-9A-F]{6}|[0-9A-F]{3})\s*/i)) {
			let hex = hexMatch[1];
			rgb = hex.length === 6
				? [ parseInt(hex[0] + hex[1], 16), parseInt(hex[2] + hex[3], 16), parseInt(hex[4] + hex[5], 16) ]
				: [ parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16) ];
		} else if (rgbMatch = input.value.match(/\s*rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*\d+\s*)?\)/)) {
			rgb = [ +rgbMatch[1], +rgbMatch[2], +rgbMatch[3] ];
		}

		// Try and put the color picker aligned to the left under the input.
		const inputRect = input.getBoundingClientRect();
		const top = inputRect.top + inputRect.height;
		const left = inputRect.left;

		const colorpicker = createElement(Player.templates.colorpicker({ HEIGHT, WIDTH, top, left, rgb }), input.parentNode);

		// Reposition around the input if the colorpicker is off screen.
		const { width: cpWidth, height: cpHeight } = colorpicker.getBoundingClientRect();
		if (e.clientX + cpWidth > document.documentElement.clientWidth) {
			colorpicker.style.left = (inputRect.left + inputRect.width - cpWidth) + 'px';
		}
		if (e.clientY + cpHeight > document.documentElement.clientHeight - 40) {
			colorpicker.style.top = (inputRect.top - cpHeight) + 'px';
		}

		input._colorpicker = colorpicker;
		colorpicker._input = input;
		
		colorpicker._colorpicker = { hsv: [ 0, 1, 1 ], rgb: rgb };

		// If there's a color in the input then update the hue/saturation positions to show it.
		if (hexMatch || rgbMatch) {
			Player.colorpicker.updateOutput(colorpicker);
		}
	},

	_handleHueMove: function (e) {
		if (!e.eventTarget._mousedown) {
			return;
		}
		e.preventDefault();
		const colorpicker = e.eventTarget.closest(`.${ns}-colorpicker`);
		const y = Math.max(0, e.clientY - e.eventTarget.getBoundingClientRect().top);
		colorpicker._colorpicker.hsv[0] = y / HEIGHT;
		const _hue = Player.colorpicker.hsv2rgb(colorpicker._colorpicker.hsv[0], 1, 1);

		colorpicker.querySelector(`.${ns}-cp-saturation`).style.background = `linear-gradient(to right, white, rgb(${_hue[0]}, ${_hue[1]}, ${_hue[2]}))`;
		e.eventTarget.querySelector('.position').style.top = Math.max(-3, (y - 6)) + 'px';

		Player.colorpicker.updateOutput(colorpicker, true);
	},

	_handleSaturationMove: function(e) {
		if (!e.eventTarget._mousedown) {
			return;
		}
		e.preventDefault();
		const colorpicker = e.eventTarget.closest(`.${ns}-colorpicker`);
		const saturationPosition = e.eventTarget.querySelector('.position');
		const x = Math.max(0, e.clientX - e.eventTarget.getBoundingClientRect().left);
		const y = Math.max(0, e.clientY - e.eventTarget.getBoundingClientRect().top);
		
		colorpicker._colorpicker.hsv[1] = x / WIDTH;
		colorpicker._colorpicker.hsv[2] = 1 - y / HEIGHT;
		saturationPosition.style.top = Math.min(HEIGHT - 3, Math.max(-3, (y - 6))) + 'px';
		saturationPosition.style.left = Math.min(WIDTH - 3, Math.max(-3, (x - 5))) + 'px';

		Player.colorpicker.updateOutput(colorpicker, true);
	},

	_handleRGBInput: function (e) {
		const colorpicker = e.eventTarget.closest(`.${ns}-colorpicker`);
		colorpicker._colorpicker.rgb[+e.eventTarget.getAttribute('data-color')] = e.eventTarget.value;
		Player.colorpicker.updateOutput(colorpicker);
	},

	updateOutput: function (colorpicker, fromHSV) {
		const order = fromHSV ? [ 'hsv', 'rgb' ] : [ 'rgb', 'hsv' ];
		colorpicker._colorpicker[order[1]] = Player.colorpicker[`${order[0]}2${order[1]}`](...colorpicker._colorpicker[order[0]]);
		const [ r, g, b ] = colorpicker._colorpicker.rgb;

		// Update the display.
		if (fromHSV) {
			colorpicker.querySelector(`.${ns}-rgb-input[data-color="0"]`).value = r;
			colorpicker.querySelector(`.${ns}-rgb-input[data-color="1"]`).value = g;
			colorpicker.querySelector(`.${ns}-rgb-input[data-color="2"]`).value = b;
		} else {
			const [ h, s, v ] = colorpicker._colorpicker.hsv;
			const huePos = colorpicker.querySelector(`.${ns}-cp-hue .position`);
			const satPos = colorpicker.querySelector(`.${ns}-cp-saturation .position`);
			const _hue = Player.colorpicker.hsv2rgb(h, 1, 1);
			colorpicker.querySelector(`.${ns}-cp-saturation`).style.background = `linear-gradient(to right, white, rgb(${_hue[0]}, ${_hue[1]}, ${_hue[2]}))`;
			huePos.style.top = (HEIGHT * h) - 3 + 'px';
			satPos.style.left = (s * WIDTH) - 3 + 'px';
			satPos.style.top = ((1 - v) * WIDTH) - 3 + 'px';
		}

		colorpicker.querySelector('.output-color').style.background = `rgb(${r}, ${g}, ${b})`;
	},

	_applyColorPicker: function (e) {
		e.preventDefault();
		e.stopPropagation();

		// Update the input.
		const colorpicker = e.eventTarget.closest(`.${ns}-colorpicker`);
		const [ r, g, b ] = colorpicker._colorpicker.rgb;
		const input = colorpicker._input;
		input.value = `rgb(${r}, ${g}, ${b})`;

		// Remove the colorpicker.
		delete input._colorpicker;
		colorpicker.parentNode.removeChild(colorpicker);

		// Focus and blur to trigger the change handler.
		input.focus();
		input.blur();
	},
	
	hsv2rgb: function(h, s, v) {
		const i = Math.floor((h * 6));
		const f = (h * 6) - i;
		const p = v * (1 - s);
		const q = v * (1 - f * s);
		const t = v * (1 - (1 - f) * s);
		const mod = i % 6;
		const r = [v, q, p, p, t, v][mod];
		const g = [t, v, v, q, p, p][mod];
		const b = [p, p, t, v, v, q][mod];

		return [
			Math.round(r * 255),
			Math.round(g * 255),
			Math.round(b * 255),
		];
	},

	rgb2hsv: function (r, g, b) {
		var max = Math.max(r, g, b),
			min = Math.min(r, g, b),
			d = max - min,
			h,
			s = (max === 0 ? 0 : d / max),
			v = max / 255;

		switch (max) {
			case min: h = 0; break;
			case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
			case g: h = (b - r) + d * 2; h /= 6 * d; break;
			case b: h = (r - g) + d * 4; h /= 6 * d; break;
		}

		return [ h, s, v ];
	},

	_updatePreview: function (e) {
		const value = e.eventTarget.value;
		const preview = e.eventTarget.parentNode.querySelector(`.${ns}-cp-preview`);
		preview.style.background = value;
	}
};
