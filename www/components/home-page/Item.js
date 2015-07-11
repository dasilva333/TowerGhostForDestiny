define(['knockout', "underscore", "jquery", "tgd",
	"json!components/destiny-data/itemDefs.js",
	"json!components/destiny-data/perkDefs.js",
	"json!components/destiny-data/statDefs.js"], function(ko, _, $, tgd, itemDefs, perkDefs, statDefs){
	var dataDir = "/www/data";
	var Item = function(model, profile) {
		var self = this;
		this.character = profile;
		this.isVisible = ko.computed(this._isVisible, this);
		this.isEquippable = function(avatarId) {
			return ko.computed(function() {
				//rules for how subclasses can be equipped
				var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
				//if it's in this character and it's equippable
				return (!self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass) ||
					//if it's in another character and it's equippable
					(self.characterId != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass);
			});
		}
		this.isStoreable = function(avatarId) {
			return ko.computed(function() {
				return (self.characterId != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses') ||
					(self.isEquipped() && self.character.id == avatarId);
			});
		}
		this.init(model);
	}

	Item.prototype = {
		init: function(item){
			var self = this;
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
					href: "https://destinydb.com/items/" + item.itemHash,
                    _id: item.itemInstanceId,
                    characterId: self.character.id,
                    damageType: item.damageType,
                    damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                    isEquipped: ko.observable(item.isEquipped),
                    isGridComplete: item.isGridComplete,
                    locked: item.locked,
                    description: description,
                    itemDescription: itemDescription,
                    bucketType: (item.location == 4) ? "Post Master" : tgd.DestinyBucketTypes[info.bucketTypeHash],
                    type: info.itemSubType,
                    typeName: itemTypeName,
                    tierType: info.tierType,
                    tierTypeName: tierTypeName,
                    icon: dataDir + info.icon,
					primaryStat: ""
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
				$.extend(self, itemObject);
            }		
		},
		hasPerkSearch: function(search) {
			var foundPerk = false,
				self = this;
			if (self.perks) {
				var vSearch = search.toLowerCase();
				self.perks.forEach(function(perk) {
					if (perk.name.toLowerCase().indexOf(vSearch) > -1 || perk.description.toLowerCase().indexOf(vSearch) > -1)
						foundPerk = true;
				});
			}
			return foundPerk;
		},
		hashProgress: function(state) {
			var self = this;
			if (typeof self.progression !== "undefined") {
				/* Missing XP */
				if (state == 1 && self.progression == false) {
					return true;
				}
				/* Full XP  but not maxed out */
				else if (state == 2 && self.progression == true && self.isGridComplete == false) {
					return true
				}
				/* Maxed weapons (Gold Borders only) */
				else if (state == 3 && self.progression == true && self.isGridComplete == true) {
					return true;
				} else {
					return false;
				}
			} else {
				return false;
			}
		},
		_isVisible: function() {
			var self = this, filters = tgd.filters;
			var searchFilter = filters.searchKeyword() == '' || self.hasPerkSearch(filters.searchKeyword()) ||
				(filters.searchKeyword() !== "" && self.description.toLowerCase().indexOf(filters.searchKeyword().toLowerCase()) > -1);
			var dmgFilter = filters.dmgFilter().length == 0 || filters.dmgFilter().indexOf(self.damageTypeName) > -1;
			var setFilter = filters.setFilter().length == 0 || filters.setFilter().indexOf(self.id) > -1;
			var tierFilter = filters.tierFilter() == 0 || filters.tierFilter() == self.tierType;
			var progressFilter = filters.progressFilter() == 0 || self.hashProgress(filters.progressFilter());
			var typeFilter = filters.typeFilter() == 0 || filters.typeFilter() == self.type;
			var dupes = _.filter(filters.duplicates(), function(id) {
				return id == self.id
			}).length;
			var showDuplicate = filters.showDuplicate() == false || (filters.showDuplicate() == true && dupes > 1);
			/*console.log( "searchFilter: " + searchFilter);
			console.log( "dmgFilter: " + dmgFilter);
			console.log( "setFilter: " + setFilter);
			console.log( "tierFilter: " + tierFilter);
			console.log( "progressFilter: " + progressFilter);
			console.log( "typeFilter: " + typeFilter);
			console.log("keyword is: " + $parent.searchKeyword());
			console.log("keyword is empty " + ($parent.searchKeyword() == ''));
			console.log("keyword has perk " + self.hasPerkSearch($parent.searchKeyword()));
			console.log("perks are " + JSON.stringify(self.perks));
			console.log("description is " + self.description);
			console.log("keyword has description " + ($parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) >-1));*/
			return (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (typeFilter) && (showDuplicate);
		}
	}
	return Item;
});	