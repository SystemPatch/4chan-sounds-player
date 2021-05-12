module.exports = [
	{
		property: 'autoshow',
		default: true,
		title: 'Autoshow',
		description: 'Automatically show the player when the thread contains sounds.',
		displayGroup: 'Display'
	},
	{
		property: 'pauseOnHide',
		default: true,
		title: 'Pause On Hide',
		description: 'Pause the player when it\'s hidden.',
		displayGroup: 'Display',
		allowInTheme: true
	},
	{
		property: 'showUpdatedNotification',
		default: true,
		title: 'Show Update Notifications',
		description: 'Show notifications when the player is successfully updated.',
		displayGroup: 'Display'
	},
	{
		property: 'hoverImages',
		title: 'Hover Images',
		default: false,
		allowInTheme: true
	},
	{
		title: 'Controls',
		displayGroup: 'Display',
		allowInTheme: true,
		settings: [
			{
				property: 'preventControlWrapping',
				title: 'Prevent Wrapping',
				description: 'Hide controls to prevent wrapping when the player is too small',
				default: true
			},
			{
				property: 'controlsHideOrder',
				title: 'Hide Order',
				description: 'Order controls are hidden in to prevent wrapping. '
					+ 'Available controls are '
					+ '<pre class="option">previous</pre> '
					+ '<pre class="option">next</pre> '
					+ '<pre class="option">seek-bar</pre> '
					+ '<pre class="option">time</pre> '
					+ '<pre class="option">duration</pre> '
					+ '<pre class="option">volume</pre> '
					+ '<pre class="option">volume-button</pre> '
					+ '<pre class="option">volume-bar</pre> '
					+ 'and <pre class="option">fullscreen</pre>.',
				default: [ 'fullscreen', 'duration', 'volume-bar', 'seek-bar', 'time', 'previous' ],
				displayMethod: 'textarea',
				inlineTextarea: true,
				format: v => v.join('\n'),
				parse: v => v.split(/\s+/)
			}
		]
	},
	{
		title: 'Minimised Display',
		description: 'Optional displays for when the player is minimised.',
		displayGroup: 'Display',
		allowInTheme: true,
		settings: [
			{
				property: 'pip',
				title: 'Thumbnail',
				description: 'Display a fixed thumbnail of the playing sound in the bottom right of the thread.',
				default: true
			},
			{
				property: 'maxPIPWidth',
				title: 'Max Width',
				description: 'Maximum width for the thumbnail.',
				default: '150px',
				updateStylesheet: true
			},
			{
				property: 'chanXControls',
				title: '4chan X Header Controls',
				description: 'Show playback controls in the 4chan X header. The display can be customised in Settings>Theme.',
				displayMethod: isChanX || null,
				default: 'closed',
				options: {
					always: 'Always',
					closed: 'Only with the player closed',
					never: 'Never'
				}
			}
		]
	},
	{
		title: 'Thread',
		displayGroup: 'Display',
		allowInTheme: true,
		settings: [
			{
				property: 'autoScrollThread',
				description: 'Automatically scroll the thread to posts as sounds play.',
				title: 'Auto Scroll',
				default: false
			},
			{
				property: 'limitPostWidths',
				description: 'Limit the width of posts so they aren\'t hidden under the player.',
				title: 'Limit Post Widths',
				default: true
			},
			{
				property: 'minPostWidth',
				title: 'Minimum Width',
				default: '50%'
			}
		]
	},
	{
		property: 'threadsViewStyle',
		title: 'Threads View',
		description: 'How threads in the threads view are listed.',
		settings: [ {
			title: 'Display',
			default: 'table',
			options: {
				table: 'Table',
				board: 'Board'
			}
		} ]
	},
	{
		title: 'Colors',
		displayGroup: 'Display',
		property: 'colors',
		updateStylesheet: true,
		allowInTheme: true,
		class: `${ns}-colorpicker-input`,
		attrs: '@focusout="colorpicker._updatePreview" @click="colorpicker.create:prevent:stop"',
		displayMethod: ({ value, attrs }) => `<div class="${ns}-col">
				<input type="text" ${attrs} value="${value}">
				<div class="${ns}-cp-preview" style="background: ${value}" @click="colorpicker.create:prevent:stop"></div>
			</div>`,
		actions: [
			{ title: 'Match Theme', handler: 'theme.forceBoardTheme:prevent' }
		],
		// These colors will be overriden with the theme defaults at initialization. They're set to yotsuba b here.
		settings: [
			{
				property: 'colors.text',
				default: '#000000',
				title: 'Text'
			},
			{
				property: 'colors.background',
				default: '#d6daf0',
				title: 'Background'
			},
			{
				property: 'colors.border',
				default: '#b7c5d9',
				title: 'Border'
			},
			{
				property: 'colors.odd_row',
				default: '#d6daf0',
				title: 'Odd Row',
			},
			{
				property: 'colors.even_row',
				default: '#b7c5d9',
				title: 'Even Row'
			},
			{
				property: 'colors.playing',
				default: '#98bff7',
				title: 'Playing Row'
			},
			{
				property: 'colors.dragging',
				default: '#c396c8',
				title: 'Dragging Row'
			},
			{
				property: 'colors.controls_background',
				default: '#3f3f44',
				title: 'Controls Background',
				description: 'The controls container element background.',
				actions: [ { title: 'Reset', handler: 'settings.reset("colors.controls_background"):prevent' } ],
			},
			{
				property: 'colors.controls_inactive',
				default: '#FFFFFF',
				title: 'Control Items',
				description: 'The playback controls and played bar.',
				actions: [ { title: 'Reset', handler: 'settings.reset("colors.controls_inactive"):prevent' } ],
			},
			{
				property: 'colors.controls_active',
				default: '#00b6f0',
				title: 'Focused Control Items',
				description: 'The control items when hovered.',
				actions: [ { title: 'Reset', handler: 'settings.reset("colors.controls_active"):prevent' } ],
			},
			{
				property: 'colors.controls_empty_bar',
				default: '#131314',
				title: 'Volume/Seek Bar Background',
				decscription: 'The background of the volume and seek bars.',
				actions: [ { title: 'Reset', handler: 'settings.reset("colors.controls_empty_bar"):prevent' } ],
			},
			{
				property: 'colors.controls_loaded_bar',
				default: '#5a5a5b',
				title: 'Loaded Bar Background',
				description: 'The loaded bar within the seek bar.',
				actions: [ { title: 'Reset', handler: 'settings.reset("colors.controls_loaded_bar"):prevent' } ],
			},
			// Not configurable but here for access in templates.
			{
				property: 'colors.page_background',
				default: 'rgb(238, 242, 255)',
				displayMethod: null,
				allowInTheme: false
			}
		]
	}
];
