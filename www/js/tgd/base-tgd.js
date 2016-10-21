//TODO find all the remote http variables and have them use a single variable
tgd.remoteServer = "https://towerghostfordestiny.com";
tgd.remoteImagePath = tgd.remoteServer + "/www/";
tgd.openTabAs = window.isMobile ? "_system" : "_blank";
tgd.bootstrapGridColumns = 24;
tgd.autoTransferStacks = false;
tgd.DestinySkillCap = 300;
tgd.DestinyStatCap = 350;
tgd.DestinyLightCap = 400;
tgd.DestinySkillTier = 60;
tgd.DestinyY1Cap = 170;
tgd.activeElement = null;
tgd.DestinyUnwantedNodes = ["Infuse", "Upgrade Damage", "Upgrade Defense", "Arc Damage", "Void Damage", "Solar Damage", "Kinetic Damage", "Ascend", "Reforge Ready", "Twist Fate", "Scabbard", "Increase Intellect", "Increase Strength", "Increase Discipline", "Deactivate Chroma", "Ornament", "New SIVA Directive"];
tgd.DestinyGeneralItems = {
    "Glimmer Credit": [3632619276, 269776572, 2904517731, 1932910919], //Network Keys, Axiomatic Beads, House Banners, Silken Codex
    "Glimmer Buffs": [3446457162, 1043138475, 1772853454, 3783295803], //Resupply Codes, Black Wax Idol, Blue Polyphage, Ether Seeds
    "Synths": [211861343, 928169143, 2180254632],
    "Parts": [1898539128],
    "Motes": [937555249],
    "Keys": [3881084296, 3815757277, 2206724918, 614056762, 4244618453, 142694124], //Key of Wyrding, SIVA Cache Key, SIVA Key Fragments, Skeleton Key, Splicer Key, Treasure Key
    "Coins": [417308266, 1738186005, 605475555], //Passage Coins, Strange Coins, 3 of Coins
    "Runes": [1565194903, 2620224196, 1556533319, 1314217221, 2906158273], //Argonarch Rune, Stolen Rune, Wormsinger Rune, Wormfeeder Rune, Antiquated Rune can be xfered
    "Planetary Resources": [2254123540, 2882093969, 3164836592, 3242866270, 1797491610], //Spirit Bloom, Spin Metal, Wormspore, Relic Iron, Helium Filaments    
    "Telemetries": [4159731660, 729893597, 3371478409, 927802664, 4141501356, 323927027, 3036931873, 2610276738, 705234570, 1485751393, 2929837733, 846470091],
    "Reputation Boosters": [2220921114, 1500229041, 1603376703]
};
tgd.lostItemsHelper = [420519466, 1322081400, 2551875383, 398517733, 583698483, 937555249];
tgd.invisibleItemsHelper = [2910404660, 2537120989];
//This is a list of items not indexed by DestinyDB
tgd.itemsNotIndexed = [];
tgd.DestinyGeneralSearches = _.sortBy(["Keys", "Synths", "Parts", "Motes", "Coins", "Runes", "Planetary Resources", "Glimmer Buffs", "Glimmer Credit", "Telemetries", "Engrams", "Chroma Colors", "Reputation Boosters"]);
tgd.DestinyArmorPieces = ["Helmet", "Gauntlet", "Chest", "Boots", "Class Items", "Artifact", "Ghost"];
tgd.DestinyArmorStats = [144602215, 1735777505, 4244567218];
// Cooldowns
tgd.cooldownsSuperA = ['5:00', '4:46', '4:31', '4:15', '3:58', '3:40'];
tgd.cooldownsSuperB = ['5:30', '5:14', '4:57', '4:39', '4:20', '4:00'];
tgd.cooldownsGrenade = ['1:00', '0:55', '0:49', '0:42', '0:34', '0:25'];
tgd.cooldownsMelee = ['1:10', '1:04', '0:57', '0:49', '0:40', '0:29'];
/* Defender, Nightstalker, Striker, Sunsinger */
tgd.subclassesSuperA = [2007186000, 4143670656, 2455559914, 3658182170];
/* Nightstalker, Gunslinger */
tgd.subclassesStrengthA = [4143670656, 1716862031];
tgd.DestinyWeaponPieces = ["Primary", "Special", "Heavy"];
tgd.DestinyGeneralExceptions = ["Ghost", "Artifact"];
tgd.DestinyOtherArmor = ["Ghost", "Class Items", "Artifact"];
tgd.DestinyNonUniqueBuckets = ["Consumables", "Materials"];
tgd.DestinyFiveRowBuckets = ["Materials", "Consumables", "Invisible", "Messages", "Lost"];
tgd.DestinyLayout = [{
    name: "Weapons",
    array: 'weapons',
    counts: [108, 30],
    bucketTypes: tgd.DestinyWeaponPieces,
    extras: [],
    view: 1,
    headerText: 'inventory_weapons'
}, {
    name: "Armor",
    array: 'armor',
    counts: [108, 50],
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
    counts: [72, 80],
    bucketTypes: ['Consumables', 'Materials', 'Ornaments', 'Shader', 'Emblem', 'Ship', 'Sparrow', 'Horn', 'Emote'],
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
tgd.DestinyBucketSizes = {
    "Materials": 20,
    "Consumables": 20,
    "Ornaments": 12,
    "Bounties": 16,
    "Quests": 32,
    'Messages': 20,
    'Invisible': 20,
    'Lost Items': 20
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
    "3796357825": "Horn",
    "3313201758": "Ornaments"
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
    "Horn": 3,
    "Ornaments": 4
};
tgd.DestinyMaxCSP = {
    "Artifact": 132,
    "Boots": 135,
    "Chest": 147,
    "Class Items": 60,
    "Gauntlet": 99,
    "Ghost": 60,
    "Helmet": 111
};
//corn ratio derived thanks to cornman0101 https://www.reddit.com/r/DestinyTheGame/comments/4jmd68/for_those_who_want_accurate_stat_predictions_from/
tgd.infusionStats = [34.5588, 34.7389, 34.919, 35.0991, 35.2792, 35.4593, 35.6394, 35.8195, 35.9996, 36.1797, 36.3598, 36.5399, 36.72, 36.9001, 37.0802, 37.2603, 37.4404, 37.6205, 37.8006, 37.9807, 38.1608, 38.3409, 38.521, 38.7011, 38.8812, 39.0613, 39.2414, 39.4215, 39.6016, 39.7817, 39.9618, 40.1419, 40.322, 40.5021, 40.6822, 40.8623, 41.0424, 41.2225, 41.4026, 41.5827, 41.7628, 41.9429, 42.123, 42.3031, 42.4832, 42.6633, 42.8434, 43.0235, 43.2036, 43.3837, 43.5638, 43.7439, 43.924, 44.1041, 44.2842, 44.4643, 44.6444, 44.8245, 45.0046, 45.1847, 45.3648, 45.5449, 45.725, 45.9051, 46.0852, 46.2653, 46.4454, 46.6255, 46.8056, 46.9857, 47.1658, 47.3459, 47.526, 47.7061, 47.8862, 48.0663, 48.2464, 48.4265, 48.6066, 48.7867, 48.9668, 49.1469, 49.327, 49.5071, 49.6872, 49.8673, 50.0474, 50.2275, 50.4076, 50.5877, 50.7678, 50.9479, 51.128, 51.3081, 51.4882, 51.6683, 51.8484, 52.0285, 52.2086, 52.3887, 52.555, 52.8096, 53.0642, 53.3188, 53.5734, 53.828, 54.0826, 54.3372, 54.5918, 54.8464, 55.101, 55.3556, 55.6102, 55.8648, 56.1194, 56.374, 56.6286, 56.8832, 57.1378, 57.3924, 57.647, 57.9016, 58.1562, 58.4108, 58.6654, 58.92, 59.1746, 59.4292, 59.6838, 59.9384, 60.193, 60.4476, 60.7022, 60.9568, 61.2114, 61.466];
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
    activeStats: [],
    shareView: false,
    shareUrl: "",
    showMissing: false,
    showArmorPerks: false,
    showArmorSC: false,
    customFilter: false,
    tooltipsEnabled: isMobile ? false : "true",
    advancedTooltips: "true",
    autoXferStacks: false,
    padBucketHeight: isMobile && !isStaticBrowser ? false : "true",
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
    farmItems: ["Engrams", "Glimmer", "Rare", "Uncommon"],
    globalItems: ["Ghost"],
    farmTarget: "Vault"
};
tgd.farmItemFilters = {
    "Engrams": function(item) {
        return item.description.indexOf("Engram") > -1 && item.bucketType != "Lost Items" && item.isEquipment === false;
    },
    "Glimmer": function(item) {
        return tgd.DestinyGeneralItems["Glimmer Credit"].indexOf(item.id) > -1;
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
                top: "55px"
            }
        },
        timeout: tgd.defaults.toastTimeout
    }
});

tgd.hammerEvents = {
    singleTap: new Hammer.Tap({
        event: 'singletap'
    }),
    doubleTap: new Hammer.Tap({
        event: 'doubletap',
        taps: 2
    }),
    tripleTap: new Hammer.Tap({
        event: 'tripletap',
        taps: 3
    }),
    holdPress: new Hammer.Press({
        event: 'hold',
        pointers: 1,
        time: 2000,
        threshold: 1
    })
};

tgd.hammerEvents.tripleTap.recognizeWith([tgd.hammerEvents.doubleTap, tgd.hammerEvents.singleTap]);
tgd.hammerEvents.doubleTap.recognizeWith(tgd.hammerEvents.singleTap);

tgd.hammerEvents.doubleTap.requireFailure(tgd.hammerEvents.tripleTap);
tgd.hammerEvents.singleTap.requireFailure([tgd.hammerEvents.tripleTap, tgd.hammerEvents.doubleTap]);