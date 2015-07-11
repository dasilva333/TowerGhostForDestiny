define([ "underscore" ], function (_) {
	return _.template('<div class="destt-talent">' +
		'<% perks.forEach(function(perk){ %>' +
			'<div class="destt-talent-wrapper">' +
				'<div class="destt-talent-icon">' +
					'<img src="<%= perk.iconPath %>" width="36">' +
				'</div>' +
				'<div class="destt-talent-description">' +
					'<%= perk.description %>' +
				'</div>' +
			'</div>' +
		'<% }) %>' +
	'</div>');
});