`<div class="${ns}-media">
	<a class="${ns}-image-link" target="_blank">
		<img class="${ns}-image"></img>
		<video class="${ns}-video"></video>
	</a>
	<div class="${ns}-controls ${ns}-row">
		${Player.templates.controls(data)}
	</div>
</div>
<div class="${ns}-list-container ${!Player.config.hoverImages ? `${ns}-hide-hover-image` : ''}" style="height: 100px">
	${Player.templates.list(data)}
</div>`