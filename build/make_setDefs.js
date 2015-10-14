var sqlite3 = require('sqlite3').verbose(),
	fs = require("fs"),
	_ = require("lodash");
	
function extractItems(callback){	
	var db = new sqlite3.Database("mobileWorldContent_en.db");
	db.all("SELECT * FROM DestinyInventoryItemDefinition", function(err, rows) {
		var obj = {};
		rows.forEach(function (row) {  
			var entry = JSON.parse(row.json);
			obj[entry["itemHash"]] = entry;
		});
		callback(obj);
	});
}

function extractRewardSources(callback){
	var db = new sqlite3.Database("mobileWorldContent_en.db");
	db.all("SELECT * FROM DestinyRewardSourceDefinition", function(err, rows) {
		var obj = {};
		rows.forEach(function (row) {  
			var entry = JSON.parse(row.json);
			obj[entry["identifier"]] = entry;
		});
		callback(obj);
	});
}

tgd = {};
tgd.DestinyArmorPieces = [ "Helmet", "Gauntlet", "Chest", "Boots", "Class Items", "Artifact" ];
tgd.DestinyWeaponPieces = [ "Primary","Special","Heavy" ];
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
}

extractItems(function(_itemDefs){
	extractRewardSources(function(rewardSources){

		var setDefs = {};
	
		 var weaponKeys = _.filter(_.map(tgd.DestinyBucketTypes, function(name, key) {
			if (tgd.DestinyWeaponPieces.indexOf(name) > -1) return parseInt(key);
		}), function(key) {
			return key > 0;
		});
		var armorKeys = _.filter(_.map(tgd.DestinyBucketTypes, function(name, key) {
			if (tgd.DestinyArmorPieces.indexOf(name) > -1) return parseInt(key);
		}), function(key) {
			return key > 0;
		});		
		
		/* Exotic Sets */
		setDefs['Exotic Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (weaponKeys.indexOf(item.bucketTypeHash) > -1 && item.tierType === 6 && item.equippable === true);
		}), 'itemHash');
		setDefs['Exotic Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (armorKeys.indexOf(item.bucketTypeHash) > -1 && item.tierType === 6 && item.equippable === true);
		}), 'itemHash');
		
		/* Crota's End */
		setDefs['CE Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (armorKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_CROTAS_END.sourceHash) > -1);
		}), 'itemHash');
		setDefs['CE Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (weaponKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_CROTAS_END.sourceHash) > -1);
		}), 'itemHash');
		
		/* Iron Banner */
		setDefs['IB Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (armorKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_VENDOR_IRON_BANNER.sourceHash) > -1);
		}), 'itemHash');
		setDefs['IB Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (weaponKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_VENDOR_IRON_BANNER.sourceHash) > -1);
		}), 'itemHash');
		
		/* Vault of Glass*/
		setDefs['VoG Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (armorKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_VAULT_OF_GLASS.sourceHash) > -1);
		}), 'itemHash');
		setDefs['VoG Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (weaponKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_VAULT_OF_GLASS.sourceHash) > -1);
		}), 'itemHash');
		
		/* Trials of Osiris */
		setDefs['ToO Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (armorKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_VENDOR_OSIRIS.sourceHash) > -1);
		}), 'itemHash');
		setDefs['ToO Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (weaponKeys.indexOf(item.bucketTypeHash) > -1 && item.equippable === true && ( item.sourceHashes.indexOf(rewardSources.SOURCE_VENDOR_OSIRIS.sourceHash) > -1 || item.itemName.indexOf("Adept") > -1 ));
		}), 'itemHash');

		/* Prison of Elders */
		setDefs['PoE Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (armorKeys.indexOf(item.bucketTypeHash) > -1 && item.tierType == 5 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_PRISON_ELDERS.sourceHash) > -1);
		}), 'itemHash');
		setDefs['PoE Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return (weaponKeys.indexOf(item.bucketTypeHash) > -1 && item.tierType == 5 && item.equippable === true && item.sourceHashes.indexOf(rewardSources.SOURCE_PRISON_ELDERS.sourceHash) > -1);
		}), 'itemHash');
		
		/* King's Fall */
		var stManual = {
			"KF Armor": [
				3471865172,
				3907799187,
				2302693613,
				2549035183,
				2242715338,
				3471865173,
				3907799186,
				2302693612,
				1846107925,
				372855004,
				521951204,
				2028036494,
				1658688593,
				1846107924,
				372855005,
				521951205,
				2028036495,
				1245063910,
				3176903681,
				217447095,
				1601524313,
				130578780,
				1245063911,
				3176903680,
				217447094,
				1601524312
			],
			"KF Weapons": [
				962497238,
				1457207757,
				2536361593,
				2918358302,
				3919765141,
				3042333086,
				2201079123,
				1397524040,
				1551744702,
				962497239,
				1457207756,
				2536361592,
				2918358303,
				3919765140,
				3042333087,
				2201079122,
				1397524041,
				1551744703
			]
		}	
		setDefs['KF Armor'] = _.pluck(_.filter(_itemDefs, function(item) {
			return stManual["KF Armor"].indexOf(item.itemHash) > -1;
		}), 'itemHash');
		setDefs['KF Weapons'] = _.pluck(_.filter(_itemDefs, function(item) {
			return stManual["KF Weapons"].indexOf(item.itemHash) > -1;
		}), 'itemHash');		
		
		
		fs.writeFileSync("../www/data/setDefs.json", "_collections="+JSON.stringify(setDefs, null, 4));
	});
});