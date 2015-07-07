define(["underscore", "Item",
	"json!components/destiny-data/itemDefs.js",
	"json!components/destiny-data/perkDefs.js",
	"json!components/destiny-data/statDefs.js",
	"tgd"], function(_, Item, itemDefs, perkDefs, statDefs, tgd){
	
	console.log("Bungie " + typeof bungie);
	var dataDir = "/www/data";
	
    var ProcessItem = function(profile, bungie) {
        return function(item) {
            if (!(item.itemHash in itemDefs)) {
                console.log("found an item without a definition! " + JSON.stringify(item));
                console.log(item.itemHash);
                return;
            }
            var info = itemDefs[item.itemHash];
            if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                var description, tierTypeName, itemDescription, itemTypeName;
                try {
                    description = decodeURIComponent(info.itemName);
                    tierTypeName = decodeURIComponent(info.tierTypeName);
                    itemDescription = decodeURIComponent(info.itemDescription);
                    itemTypeName = decodeURIComponent(info.itemTypeName);
                } catch (e) {
                    description = info.itemName;
                    tierTypeName = info.tierTypeName;
                    itemDescription = info.itemDescription;
                    itemTypeName = info.itemTypeName;
                }
                var itemObject = {
                    id: item.itemHash,
                    _id: item.itemInstanceId,
                    characterId: profile.id,
                    damageType: item.damageType,
                    damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                    isEquipped: item.isEquipped,
                    isGridComplete: item.isGridComplete,
                    locked: item.locked,
                    description: description,
                    itemDescription: itemDescription,
                    bucketType: (item.location == 4) ? "Post Master" : tgd.DestinyBucketTypes[info.bucketTypeHash],
                    type: info.itemSubType,
                    typeName: itemTypeName,
                    tierType: info.tierType,
                    tierTypeName: tierTypeName,
                    icon: dataDir + info.icon
                };
                //tgd.duplicates.push(item.itemHash);
                if (item.primaryStat) {
                    itemObject.primaryStat = item.primaryStat.value;
                }
                if (info.bucketTypeHash == "2197472680" && item.progression) {
                    itemObject.primaryStat = ((item.progression.currentProgress / item.progression.nextLevelAt) * 100).toFixed(0) + "%";
                }
                if (item.progression) {
                    itemObject.progression = (item.progression.progressToNextLevel <= 1000 && item.progression.currentProgress > 0);
                }

                itemObject.weaponIndex = tgd.DestinyWeaponPieces.indexOf(itemObject.bucketType);
                itemObject.armorIndex = tgd.DestinyArmorPieces.indexOf(itemObject.bucketType);
                /* both weapon engrams and weapons fit under this condition*/
                if ((itemObject.weaponIndex > -1 || itemObject.armorIndex > -1) && item.perks.length > 0) {
                    itemObject.perks = item.perks.map(function(perk) {
                        if (perk.perkHash in perkDefs) {
                            var p = perkDefs[perk.perkHash];
                            return {
                                //iconPath: bungie.getUrl() + perk.iconPath,
                                name: p.displayName,
                                description: p.displayDescription
                            }
                        } else {
                            return perk;
                        }
                    });
                    itemObject.isUnique = false;
                }

                if (itemObject.typeName && itemObject.typeName == "Emblem") {
                    itemObject.backgroundPath = bungie.makeBackgroundUrl(info.secondaryIcon);
                }
                if (itemObject.bucketType == "Materials" || itemObject.bucketType == "Consumables") {
                    itemObject.primaryStat = item.stackSize;
                }
                if (info.itemType == 2 && itemObject.bucketType != "Class Items") {
                    itemObject.stats = {};
                    _.each(item.stats, function(stat) {
                        if (stat.statHash in statDefs) {
                            var p = statDefs[stat.statHash];
                            itemObject.stats[p.statName] = stat.value;
                        }
                    });
                }
                //console.log("new item time " + (new Date()-t));
                profile.items.push(new Item(itemObject, profile));
            }
        }
    }
	return ProcessItem;
});	