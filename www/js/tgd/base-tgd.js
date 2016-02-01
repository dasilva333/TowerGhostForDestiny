//TODO find all the remote http variables and have them use a single variable
tgd.remoteServer = "https://towerghostfordestiny.com";
tgd.remoteImagePath = tgd.remoteServer + "/www/";
tgd.openTabAs = window.isMobile ? "_system" : "_blank";
tgd.bootstrapGridColumns = 24;
tgd.autoTransferStacks = false;
tgd.DestinySkillCap = 300;
tgd.DestinySkillTier = 60;
tgd.DestinyY1Cap = 170;
tgd.activeElement = null;
tgd.DestinyUnwantedNodes = ["Infuse", "Upgrade Damage", "Upgrade Defense", "Arc Damage", "Void Damage", "Solar Damage", "Kinetic Damage", "Ascend", "Reforge Ready", "Twist Fate", "Scabbard", "Increase Intellect", "Increase Strength", "Increase Discipline"];
tgd.DestinyGeneralItems = {
    "GlimmerConsumables": [3632619276, 269776572, 2904517731, 1932910919], //Network Keys, Axiomatic Beads, House Banners, Silken Codex
    "Synths": [211861343, 928169143, 2180254632],
    "Parts": [1898539128],
    "Motes": [937555249],
    "Coins": [417308266, 1738186005, 605475555], //Passage Coins, Strange Coins, 3 of Coins
    "Runes": [1565194903, 2620224196, 1556533319, 1314217221, 2906158273], //Argonarch Rune, Stolen Rune, Wormsinger Rune, Wormfeeder Rune, Antiquated Rune can be xfered
    "Planetary Resources": [2254123540, 2882093969, 3164836592, 3242866270, 1797491610], //Spirit Bloom, Spin Metal, Wormspore, Relic Iron, Helium Filaments
    "Glimmer Consumables": [3446457162, 1043138475, 1772853454, 3783295803], //Resupply Codes, Black Wax Idol, Blue Polyphage, Ether Seeds
    "Telemetries": [4159731660, 729893597, 3371478409, 927802664, 4141501356, 323927027, 3036931873, 2610276738, 705234570, 1485751393, 2929837733, 846470091]
};
tgd.lostItemsHelper = [420519466, 1322081400, 2551875383, 398517733, 583698483, 937555249];
tgd.invisibleItemsHelper = [2910404660, 2537120989];
//This is a list of items not indexed by DestinyDB
tgd.itemsNotIndexed = [];
tgd.DestinyGeneralSearches = ["Synths", "Parts", "Motes", "Coins", "Runes", "Planetary Resources", "Glimmer Consumables", "Telemetries", "Engram"];
tgd.DestinyArmorPieces = ["Helmet", "Gauntlet", "Chest", "Boots", "Class Items", "Artifact", "Ghost"];
tgd.DestinyArmorStats = [144602215, 1735777505, 4244567218];
tgd.DestinyWeaponPieces = ["Primary", "Special", "Heavy"];
tgd.DestinyGeneralExceptions = ["Ghost", "Artifact"];
tgd.DestinyNonUniqueBuckets = ["Consumables", "Materials"];
tgd.DestinyFiveRowBuckets = ["Materials", "Consumables", "Invisible", "Messages", "Lost"];
tgd.DestinyLayout = [{
    name: "Weapons",
    array: 'weapons',
    counts: [72, 30],
    bucketTypes: tgd.DestinyWeaponPieces,
    extras: [],
    view: 1,
    headerText: 'inventory_weapons'
}, {
    name: "Armor",
    array: 'armor',
    counts: [72, 50],
    bucketTypes: tgd.DestinyArmorPieces,
    extras: tgd.DestinyGeneralExceptions,
    view: 2,
    headerText: 'inventory_armor'
}, {
    name: "Sub Classes",
    array: '',
    counts: [0, 0],
    bucketTypes: ['Subclasses'],
    extras: [],
    view: 3,
    headerText: 'inventory_subclasses'
}, {
    name: "General",
    array: 'general',
    counts: [36, 80],
    bucketTypes: ['Consumables', 'Materials', 'Shader', 'Emblem', 'Ship', 'Sparrow', 'Horn', 'Emote'],
    extras: tgd.DestinyGeneralExceptions,
    view: 3,
    headerText: 'inventory_general'
}, {
    name: "Post Master",
    array: 'postmaster',
    counts: [60, 60],
    bucketTypes: ['Messages', 'Invisible', 'Lost Items', 'Bounties', 'Quests', 'Mission'],
    extras: [],
    view: 3,
    headerText: 'inventory_postmaster'
}];
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
    "2": "Warlock"
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
    "1801258597": "Quests",
    "3796357825": "Horn"
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
    "Emote": 3,
    "Horn": 3
};
tgd.DestinyMaxCSP = {
    "Helmet": 104,
    "Gauntlet": 93,
    "Chest": 138,
    "Boots": 128,
    "Class Items": 58,
    "Artifact": 124,
    "Ghost": 58
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
tgd.languages = [{
    code: "en",
    description: "English",
    bungie_code: "en"
}, {
    code: "es",
    description: "Spanish",
    bungie_code: "es"
}, {
    code: "it",
    description: "Italian",
    bungie_code: "it"
}, {
    code: "de",
    description: "German",
    bungie_code: "de"
}, {
    code: "ja",
    description: "Japanese",
    bungie_code: "ja"
}, {
    code: "pt",
    description: "Portuguese",
    bungie_code: "pt-br"
}, {
    code: "fr",
    description: "French",
    bungie_code: "fr"
}, {
    code: "tr",
    description: "Turkish",
    bungie_code: "en"
}];
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
    activeClasses: [],
    shareView: false,
    shareUrl: "",
    showMissing: false,
    showArmorPerks: false,
    showArmorSC: false,
    customFilter: false,
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
    vaultPos: 0,
    itemDefs: "",
    preferredSystem: "PSN",
    ccWidth: "",
    layoutMode: "even",
    autoUpdates: (isFirefox || isIOS || isAndroid || isChrome) ? "true" : false,
    toastTimeout: 2600,
    armorViewBy: "Light",
    sectionsTemplate: "image-grid-template",
    farmMode: false,
    farmViewEnabled: false,
    farmItems: ["Engrams", "Glimmer", "Rare", "Uncommon"]
};
tgd.farmItemFilters = {
    "Engrams": function(item) {
        return item.description.indexOf("Engram") > -1 && item.bucketType != "Lost Items" && item.isEquipment === false;
    },
    "Glimmer": function(item) {
        return tgd.DestinyGeneralItems.GlimmerConsumables.indexOf(item.id) > -1;
    },
    "Rare": function(item) {
        return item.tierType == 4 && item.locked() === false && (item.armorIndex > -1 || item.weaponIndex > -1) && item.transferStatus < 2;
    },
    "Uncommon": function(item) {
        return item.tierType == 3 && item.locked() === false && (item.armorIndex > -1 || item.weaponIndex > -1) && item.transferStatus < 2;
    }
};

/*
	WARNING:
	This needs to be the first call prior to any notif, failure to do so results in a #toaster element created with improper settings, 
	attempting to change notif settings on the fly requires manual removal of html element
*/
$.toaster({
    settings: {
        toaster: {
            css: {
                top: "45px"
            }
        },
        timeout: tgd.defaults.toastTimeout
    }
});