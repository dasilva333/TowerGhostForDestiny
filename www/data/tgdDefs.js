window.ua = navigator.userAgent;
window.isNWJS = (typeof require != "undefined");
window.isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && typeof chrome != "undefined";
window.isIOS = (/ios|iphone|ipod|ipad/i.test(ua));
window.isAndroid = (/android/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isMobile = (window.isIOS || window.isAndroid || window.isWindowsPhone);
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.supportsCloudSaves = window.isChrome || window.isMobile;
window.tgd = {};
tgd.localLogging = false;
tgd.localLog = function(msg) {
	if (tgd.localLogging) {
		console.log(msg);
	}
};
tgd.DestinyLayout = [
  { "Weapons": { array: 'weapons', counts: [36,30], bucketTypes: ['Primary','Special','Heavy'], view: 1, headerText: 'inventory_weapons' } },
  { "Armor": { array: 'armor', counts: [24,50], bucketTypes: ['Helmet','Gauntlet','Chest', 'Boots','Class Items'], view: 2, headerText: 'inventory_armor' } },
  { "Sub Classes": { array: '', counts: [0,0], bucketTypes: ['Subclasses'], view: 3, headerText: 'inventory_subclasses' } },
  { "General": { array: 'general', counts: [24,70], bucketTypes: ['Consumables','Materials', 'Shader','Emblem','Ship','Sparrow'], view: 3, headerText: 'inventory_general' } },
  { "Post Master": { array: 'postmaster', counts: [60,60], bucketTypes: ['Messages','Invisible','Lost Items','Bounties','Mission'], view: 3, headerText: 'inventory_postmaster' } }
]
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
	"375726501": "Mission",
	"2197472680": "Bounties",
	"12345": "Post Master",
	"2422292810": "Post Master",
	"1367666825": "Invisible"
}
tgd.DestinyBucketColumns = {
	"Post Master": 4, 
	"Chest": 3, 
	"Boots": 3, 
	"Ship": 3, 
	"Heavy": 3, 
	"Consumables": 4, 
	"Primary": 3, 
	"Class": 3, 
	"Class Items": 3, 
	"Sparrow": 3, 
	"Special": 3, 
	"Shader": 3, 
	"Subclasses": 3,
	"Helmet": 3,
	"Gauntlet": 3, 
	"Materials": 4,
	"Emblem": 3,
	"Bounties": 4,
	//TODO: Improve this so I don't need two records
	"Post": 4,
	"Post Master": 4,
	"Messages": 4,
	"Lost": 4,
	"Lost Items": 4,
	"Mission": 4,
	"Invisible": 4
}
tgd.DestinyUnwantedNodes = ["Upgrade Damage","Upgrade Defense","Arc Damage","Void Damage","Solar Damage","Kinetic Damage","Ascend","Reforge Ready"]
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
	doRefresh: isMobile ? false : "true",
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
	tooltipsEnabled: isMobile ? false : "true",
	autoTransferStacks: false,
	padBucketHeight: isMobile ? false : "true",
	dragAndDrop: isMobile ? false : "true",
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
	//as of 2.7.0 I added versioning to itemDefs so the default would be this for everyone
	defLocaleVersion: "2.7.0",
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
			'<div class="destt-talent-description" style="color: <%= perk.active == true ? \'white\' : \'gray\' %>">' +
				'<%= perk.description %>' +
			'</div>' +
		'</div>' +
	'<% }) %>' +
'</div>';

tgd.languagesTemplate = '<div class="row button-group">' +
	'<% languages.forEach(function(language){ %>' +
		'<div class="col-xs-6 col-sm-4 col-md-4 col-lg-3 text-center">' +
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

tgd.selectMultiCharactersTemplate = '<div id="menu">' +
	'<div class="panel list-group">' +
		'<div class="list-group-item row">' +
			'<div class="item-name col-xs-12 col-sm-12 col-md-12 col-lg-12">' + 				
				'<p><%= description %></p>' +
			'</div>' +
		'</div>' +
		'<div id="opt1" class="collapse in">' +
			'<div class="list-group-item row">' +
				'<div class="locations col-xs-12 col-sm-12 col-md-12 col-lg-12">' +					
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
	'</div>' +
'</div>';
	
tgd.swapTemplate = '<ul class="list-group">' +
	'<% swapArray.forEach(function(pair){ %>' +
		'<li class="list-group-item">' +
			'<div class="row">' +
				'<div class="text-center col-xs-12 col-sm-12 col-md-12 col-lg-6">' +
					'<%= pair.description %>' +
				'</div>' +
				'<div class="text-right col-xs-5 col-sm-5 col-md-5 col-lg-2">' +
					'<a class="item" href="<%= pair.targetItem && pair.targetItem.href %>" id="<%= pair.targetItem && pair.targetItem._id %>">' +
						'<img class="itemImage" src="<%= (pair.targetItem && pair.targetItem.icon) || pair.targetIcon %>">' +
					'</a>' +
				'</div>' +
				'<div class="text-center col-xs-2 col-sm-2 col-md-2 col-lg-2">' +
					'<img src="<%= pair.actionIcon %>">' +
				'</div>' +
				'<div class="text-left col-xs-5 col-sm-5 col-md-5 col-lg-2">' +
					'<a class="item" href="<%= pair.swapItem && pair.swapItem.href %>" id="<%= pair.swapItem && pair.swapItem._id %>">' +
						'<img class="itemImage" src="<%= (pair.swapItem && pair.swapItem.icon) || pair.swapIcon %>">' +
					'</a>' +
				'</div>' +
			'</div>' +
		'</li>' +
	'<% }) %>' +
'</ul>';
