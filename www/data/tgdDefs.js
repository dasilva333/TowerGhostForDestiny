window.ua = navigator.userAgent;
window.isChrome = (typeof chrome !== "undefined");
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.supportsCloudSaves = window.isChrome || window.isMobile;
window.tgd = {};

tgd.DestinyViews = {
	"0": "All",
	"1": "Weapons",
	"2": "Armor",
	"3": "General"
};
tgd.DestinyGender = {
	"0": "Male",
	"1": "Female"
};
tgd.DestinyClass = {
    "0": "Titan",
    "1": "Hunter",
    "2": "Warlock",
    "3": "Unknown"
};
tgd.DestinyDamageTypes = {
    "0": "None",
    "1": "Kinetic",
    "2": "Arc",
    "3": "Solar",
    "4": "Void",
    "5": "Raid"
};
tgd.DestinyBucketTypes = {
	"1498876634": "Primary",
	"2465295065": "Special",
	"953998645": "Heavy",
	"3448274439": "Helmet",
	"3551918588": "Gauntlet",
	"14239492": "Chest",
	"20886954": "Boots",
	"2973005342": "Shader",
	"4274335291": "Emblem",
	"2025709351": "Sparrow",
	"284967655": "Ship",
	"3865314626": "Materials",
	"1469714392": "Consumables",
	"1585787867": "Class Items",
	"3284755031": "Subclasses",
	"12345": "Post Master"
}
tgd.DestinyArmorPieces = [ "Helmet", "Gauntlet", "Chest", "Boots", "Class Items" ];
tgd.DestinyWeaponPieces = [ "Primary","Special","Heavy" ];
tgd.languages = [
	{ code: "en", description: "English", bungie_code: "en" },
	{ code: "es", description: "Spanish", bungie_code: "es" },
	{ code: "it", description: "Italian", bungie_code: "it" },
	{ code: "de", description: "German", bungie_code: "de" },
	{ code: "ja", description: "Japanese", bungie_code: "ja" },
	{ code: "pt", description: "Portuguese", bungie_code: "pt-br" },
	{ code: "fr", description: "French", bungie_code: "fr" }	
];

tgd.defaults = {
	searchKeyword: "",
	doRefresh: isMobile ? false : true,
	refreshSeconds: 300,
	tierFilter: 0,
	typeFilter: 0,
	dmgFilter: [],
	activeView: 0,
	progressFilter: 0,
	showDuplicate: false,
	setFilter: [],
	shareView: false,
	shareUrl: "",
	showMissing: false,
	tooltipsEnabled: isMobile ? false : true,
	autoTransferStacks: false,
	padBucketHeight: false,
	xsColumn: 12,
	smColumn: 6,
	mdColumn: 4,
	lgColumn: 3,
	//device and bungie locale
	locale: "en",
	//user interface set locale
	appLocale: "",
	//internally cached version of the itemDefs
	defsLocale: "en",
	vaultPos: 0,
	itemDefs: "",
	preferredSystem: "PSN"
};

tgd.perksTemplate = '<div class="destt-talent">' +
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
'</div>';

tgd.languagesTemplate = '<div class="row button-group">' +
	'<% languages.forEach(function(language){ %>' +
		'<div class="col-xs-3 text-center">' +
			'<button class="btn-setLanguage btn btn-lg btn-default <%= language.bungie_code == locale ? \'btn-primary\' : \'\' %>" value="<%= language.bungie_code %>"><%= language.description %></button>' +
		'</div>' +
	'<% }) %>' +
'</div>';

tgd.normalizeTemplate = '<div id="menu">' +
	'<div class="panel list-group">' +
		'<div class="list-group-item row">' +
			'<div class="item-name col-xs-12 col-sm-12 col-md-12 col-lg-12">' + 
				'<!-- reenable this button if/when more options are added ' +
				'<p class="alignright"><button class="btn btn-default" data-toggle="collapse" data-target="#opt1" data-parent="#menu">...</button></p>' +
				'-->' +
				'<p>Normalize: equally distribute <%= item.description %> across the selected characters</p>' +
			'</div>' +
		'</div>' +
		'<div id="opt1" class="collapse in">' +
			'<div class="list-group-item row">' +
				'<div class="locations col-xs-12 col-sm-12 col-md-12 col-lg-12">' +
					'<div class="move-button col-xs-2 col-sm-2 col-md-2 col-lg-2">' +
						'<div class="attkIcon">' +
							'<!-- <div class="icon-banner"><%= item.description %></div> -->' +
							'<img src="<%= item.icon %>">' +
							'<div class="lower-left" id="total"><%= total %></div>' +
						'</div>' +
					'</div>' +
					'<div class="move-button col-xs-2 col-sm-2 col-md-2 col-lg-2"><!-- padding --></div>' +
					'<% for (i = 0; i < characters.length; i++){ %>' +
						'<div class="move-button col-xs-2 col-sm-2 col-md-2 col-lg-2" id="char<%= i %>">' +
							'<div class="attkIcon">' +
								'<div class="icon-banner"><%= characters[i].classType %></div>' +								
								'<% if (selected[characters[i].id] == true){ %>' +
									'<img src="<%= characters[i].imgIcon %>" style="border:3px solid yellow" id="char<%= i %>img">' +
								'<% } else { %>' +
									'<img src="<%= characters[i].imgIcon %>" style="border:none" id="char<%= i %>img">' +
								'<% } %>' +
								'<div class="lower-left"><%= characters[i].classLetter %></div>' +
							'</div>' +
						'</div>' +
					'<% } %>' +
				'</div>' +
			'</div>' +
		'</div>' +		
		'<!-- example for adding more entries ' +
		'<div class="list-group-item row">' + 
			'<p class="alignright"><button class="btn btn-default" data-toggle="collapse" data-target="#opt2" data-parent="#menu">...</button></p>' +
			'<p>Other thing: blah blah <%= item.description %> blah blah</p>' +
		'</div>' +		
		'<div id="opt2" class="collapse">' +
			'<a class="list-group-item row">sub-item 1</a>' +
			'<a class="list-group-item row">sub-item 2</a>' +
		'</div>' +
		'-->' +
	'</div>' +
'</div>';