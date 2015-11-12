window.ua = navigator.userAgent;
window.isNWJS = (typeof require != "undefined");
window.isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && typeof chrome != "undefined";
window.isFirefox = (/firefox/i.test(ua));
window.isIOS = (/ios|iphone|ipod|ipad/i.test(ua));
window.isAndroid = (/android/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isMobile = (window.isIOS || window.isAndroid || window.isWindowsPhone);
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.tgd = {};
tgd.localLogging = false;
tgd.localLog = function(msg) {
    if (tgd.localLogging) {
        console.log(msg);
    }
};
//TODO find all the remote http variables and have them use a single variable
tgd.remoteImagePath = "https://towerghostfordestiny.com/www/";
tgd.dataDir = "data";
tgd.autoTransferStacks = false;
tgd.DestinySkillCap = 300;
tgd.activeElement = null;
//Network Keys, Axiomatic Beads, House Banners, Silken Codex
tgd.DestinyUnwantedNodes = ["Infuse", "Upgrade Damage", "Upgrade Defense", "Arc Damage", "Void Damage", "Solar Damage", "Kinetic Damage", "Ascend", "Reforge Ready","Twist Fate","Scabbard"];
tgd.DestinyGlimmerConsumables = [3632619276, 269776572, 2904517731, 1932910919];
tgd.DestinyGeneralSearches = ["Synths", "Parts", "Motes", "Coins", "Runes", "Planetary Resources", "Glimmer Consumables", "Telemetries"];
tgd.DestinyArmorPieces = ["Helmet", "Gauntlet", "Chest", "Boots", "Class Items", "Artifact", "Ghost"];
tgd.DestinyWeaponPieces = ["Primary", "Special", "Heavy"];
tgd.DestinyGeneralExceptions = ["Ghost", "Artifact"];
tgd.DestinyNonUniqueBuckets = ["Consumables", "Materials"];
tgd.DestinyFiveRowBuckets = ["Materials", "Consumables", "Invisible", "Messages", "Lost"];
tgd.DestinyLayout = [
    {
        name: "Weapons",
        array: 'weapons',
        counts: [72, 30],
        bucketTypes: tgd.DestinyWeaponPieces,
        view: 1,
        headerText: 'inventory_weapons'
    },
    {
        name: "Armor",
        array: 'armor',
        counts: [72, 50],
        bucketTypes: tgd.DestinyArmorPieces,
        view: 2,
        headerText: 'inventory_armor'
    },
    {
        name: "Sub Classes",
        array: '',
        counts: [0, 0],
        bucketTypes: ['Subclasses'],
        view: 3,
        headerText: 'inventory_subclasses'
    },
    {
        name: "General",
        array: 'general',
        counts: [36, 80],
        bucketTypes: ['Consumables', 'Materials', 'Shader', 'Emblem', 'Ship', 'Sparrow', 'Emote'],
        view: 3,
        headerText: 'inventory_general'
    },
    {
        name: "Post Master",
        array: 'postmaster',
        counts: [60, 60],
        bucketTypes: ['Messages', 'Invisible', 'Lost Items', 'Bounties', 'Quests', 'Mission'],
        view: 3,
        headerText: 'inventory_postmaster'
    }
];
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
tgd.DestinyClassNames = {};
Object.keys(tgd.DestinyClass).forEach(function(key, index) {
    tgd.DestinyClassNames[tgd.DestinyClass[index]] = key;
});
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
    "1367666825": "Invisible",
    "4023194814": "Ghost",
    "434908299": "Artifact",
    "3054419239": "Emote",
    "1801258597": "Quests"
};
tgd.DestinyBucketColumns = {
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
    "Invisible": 4,
    "Ghost": 3,
    "Artifact": 3,
    "Quests": 4,
    "Emote": 3
};
tgd.DestinyBucketWeights = [{
    "Primary": 13.04,
    "Special": 13.04,
    "Heavy": 13.04,
    "Helmet": 10.87,
    "Gauntlet": 10.87,
    "Chest": 10.87,
    "Boots": 10.87,
    "Class Items": 8.7,
    "Ghost": 8.7
}, {
    "Primary": 12,
    "Special": 12,
    "Heavy": 12,
    "Helmet": 10,
    "Gauntlet": 10,
    "Chest": 10,
    "Boots": 10,
    "Class Items": 8,
    "Ghost": 8,
    "Artifact": 8
}];
tgd.languages = [
    {
        code: "en",
        description: "English",
        bungie_code: "en"
    },
    {
        code: "es",
        description: "Spanish",
        bungie_code: "es"
    },
    {
        code: "it",
        description: "Italian",
        bungie_code: "it"
    },
    {
        code: "de",
        description: "German",
        bungie_code: "de"
    },
    {
        code: "ja",
        description: "Japanese",
        bungie_code: "ja"
    },
    {
        code: "pt",
        description: "Portuguese",
        bungie_code: "pt-br"
    },
    {
        code: "fr",
        description: "French",
        bungie_code: "fr"
    },
    {
        code: "tr",
        description: "Turkish",
        bungie_code: "en"
    }
];
tgd.bootstrapGridColumns = 24;
tgd.defaults = {
    searchKeyword: "",
    doRefresh: isMobile ? false : "true",
    refreshSeconds: 300,
    tierFilter: 0,
    weaponFilter: 0,
    armorFilter: 0,
    generalFilter: 0,
    dmgFilter: [],
    activeView: 0,
    activeSort: 0,
    progressFilter: 0,
    showDuplicate: false,
    setFilter: [],
    shareView: false,
    shareUrl: "",
    showMissing: false,
    tooltipsEnabled: isMobile ? false : "true",
    advancedTooltips: isMobile ? false : "true",
    autoXferStacks: false,
    padBucketHeight: isMobile ? false : "true",
    dragAndDrop: false,
    xsColumn: tgd.bootstrapGridColumns,
    smColumn: tgd.bootstrapGridColumns / 2,
    mdColumn: tgd.bootstrapGridColumns / 3,
    lgColumn: tgd.bootstrapGridColumns / 4,
    vaultColumns: tgd.bootstrapGridColumns / 4,
    vaultWidth: tgd.bootstrapGridColumns / 4,
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
    preferredSystem: "PSN",
    ccWidth: "",
    layoutMode: "even",
	autoUpdates: false
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

tgd.statsTemplate = '<div class="destt-stat">' +
	'<% Object.keys(stats).forEach(function(key){ %>' +
		'<div class="stat-bar">' +
			'<div class="stat-bar-label">' +
				'<%= key %>' +
			'</div>' +
			'<div class="stat-bar-static-value">' +
				'<%= stats[key] %>' +
			'</div>' +
			'<div class="stat-bar-empty"><div style="width:<%= stats[key] %>%" class="stat-bar-fill"></div></div>'+
			'<div class="stat-bar-value">' +
				'<%= stats[key] %>' +
			'</div>' +
		'</div>' +
	'<% }) %>' +
'</div>';

tgd.languagesTemplate = '<div class="row button-group">' +
	'<% languages.forEach(function(language){ %>' +
		'<div class="col-xs-12 col-sm-8 col-md-8 col-lg-6 text-center">' +
			'<button class="btn-setLanguage btn btn-lg btn-default <%= language.code == locale ? \'btn-primary\' : \'\' %>" value="<%= language.code %>"><%= language.description %></button>' +
		'</div>' +
	'<% }) %>' +
'</div>';

tgd.normalizeTemplate = '<div id="menu">' +
	'<div class="panel list-group">' +
		'<div class="list-group-item row">' +
			'<div class="item-name col-xs-24 col-sm-24 col-md-24 col-lg-24">' + 
				'<!-- reenable this button if/when more options are added ' +
				'<p class="alignright"><button class="btn btn-default" data-toggle="collapse" data-target="#opt1" data-parent="#menu">...</button></p>' +
				'-->' +
				'<p>Normalize: equally distribute <%= item.description %> across the selected characters</p>' +
			'</div>' +
		'</div>' +
		'<div id="opt1" class="collapse in">' +
			'<div class="list-group-item row">' +
				'<div class="locations col-xs-24 col-sm-24 col-md-24 col-lg-24">' +
					'<div class="move-button col-xs-4 col-sm-4 col-md-4 col-lg-4">' +
						'<div class="attkIcon">' +
							'<!-- <div class="icon-banner"><%= item.description %></div> -->' +
							'<img src="<%= item.icon %>">' +
							'<div class="lower-left" id="total"><%= total %></div>' +
						'</div>' +
					'</div>' +
					'<div class="move-button col-xs-4 col-sm-4 col-md-4 col-lg-4"><!-- padding --></div>' +
					'<% for (i = 0; i < characters.length; i++){ %>' +
						'<div class="move-button col-xs-4 col-sm-4 col-md-4 col-lg-4" id="char<%= i %>">' +
							'<div class="attkIcon">' +
								'<div class="icon-banner"><%= characters[i].classType() %></div>' +								
								'<% if (selected[characters[i].id] == true){ %>' +
									'<img src="<%= characters[i].icon() %>" style="border:3px solid yellow" id="char<%= i %>img">' +
								'<% } else { %>' +
									'<img src="<%= characters[i].icon() %>" style="border:none" id="char<%= i %>img">' +
								'<% } %>' +
								'<div class="lower-left"><%= characters[i].classLetter() %></div>' +
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
			'<div class="item-name col-xs-24 col-sm-24 col-md-24 col-lg-24">' + 				
				'<p><%= description %></p>' +
			'</div>' +
		'</div>' +
		'<div id="opt1" class="collapse in">' +
			'<div class="list-group-item row">' +
				'<div class="locations col-xs-24 col-sm-24 col-md-24 col-lg-24">' +					
					'<div class="move-button col-xs-4 col-sm-4 col-md-4 col-lg-4"><!-- padding --></div>' +
					'<% for (i = 0; i < characters.length; i++){ %>' +
						'<div class="move-button col-xs-4 col-sm-4 col-md-4 col-lg-4" id="char<%= i %>">' +
							'<div class="attkIcon">' +
								'<div class="icon-banner"><%= characters[i].classType() %></div>' +								
								'<% if (selected[characters[i].id] == true){ %>' +
									'<img src="<%= characters[i].icon() %>" style="border:3px solid yellow" id="char<%= i %>img">' +
								'<% } else { %>' +
									'<img src="<%= characters[i].icon() %>" style="border:none" id="char<%= i %>img">' +
								'<% } %>' +
								'<div class="lower-left"><%= characters[i].classLetter() %></div>' +
							'</div>' +
						'</div>' +
					'<% } %>' +
				'</div>' +
			'</div>' +
		'</div>' +
	'</div>' +
'</div>';
	
tgd.swapTemplate = '<p>Tip: You may click on a swap item to cycle through alternative replacements. </p><ul class="list-group">' +
	'<% swapArray.forEach(function(pair){ %>' +
		'<li class="list-group-item">' +
			'<div class="row">' +
				'<div class="text-center col-xs-24 col-sm-24 col-md-24 col-lg-12">' +
					'<%= pair.description %>' +
				'</div>' +
				'<div class="text-right col-xs-10 col-sm-10 col-md-10 col-lg-4">' +
					'<a class="item" href="<%= pair.targetItem && pair.targetItem.href %>">' +
						'<img class="itemImage" src="<%= (pair.targetItem && pair.targetItem.icon) || pair.targetIcon %>">' +
					'</a>' +
				'</div>' +
				'<div class="text-center col-xs-4 col-sm-4 col-md-4 col-lg-4">' +
					'<img src="<%= pair.actionIcon %>">' +
				'</div>' +
				'<div class="text-left col-xs-10 col-sm-10 col-md-10 col-lg-4">' +
					'<a class="swapItem item" href="<%= pair.swapItem && pair.swapItem.href %>" instanceid="<%= pair.swapItem && pair.swapItem._id %>">' +
						'<img class="itemImage" src="<%= (pair.swapItem && pair.swapItem.icon) || pair.swapIcon %>">' +
					'</a>' +
				'</div>' +
			'</div>' +
		'</li>' +
	'<% }) %>' +
'</ul>';
