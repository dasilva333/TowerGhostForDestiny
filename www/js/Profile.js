var Profile = function(character, items) {
    var self = this;
	
	this.profile = character;
	this.order = ko.observable();
	this.icon = ko.observable("");
	this.background = ko.observable("");
	this.items = ko.observableArray();
	this.uniqueName = "";
	this.classLetter = "";
	this.race = "";
	
	this.weapons = ko.computed(this._weapons, this);
	this.armor = ko.computed(this._armor, this);
	this.general = ko.computed(this._general, this);
	this.postmaster = ko.computed(this._postmaster, this);
	this.messages = ko.computed(this._messages, this);
    this.lostItems = ko.computed(this._lostItems, this);
	this.container = ko.observable();
	var reloadingBucket = false;
    this.reloadBucket = function(bucketType) {
		/* this function should exist under Profile object not in app */
        if (reloadingBucket) {
            //console.log("reentrancy guard hit");
            return;
        }
        reloadingBucket = true;
        //console.log("reloadBucket(" + self.id + ", " + bucketType + ")");

        var itemsToRemove = _.filter(self.items(), {
            bucketType: bucketType
        });
        // manually remove so as to avoid knockout events firing and killing perf on mobile
        var ary = self.items();
        for (var i = 0; i < itemsToRemove.length; ++i) {
            var pos = ary.indexOf(itemsToRemove[i]);
            if (pos > -1) {
                ary.splice(pos, 1);
            }
            //self.items.remove(itemsToRemove[i]);
        }
        self.items.valueHasMutated();

        if (self.id == "Vault") {
            app.bungie.vault(function(results, response) {
                if (results && results.data && results.data.buckets) {
                    var items = [];
                    results.data.buckets.forEach(function(bucket) {
                        bucket.items.forEach(function(item) {
                            var info = window._itemDefs[item.itemHash];
                            if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                                var itemBucketType = (item.location == 4) ? (item.isEquipment ? "Lost Items" : "Messages") : tgd.DestinyBucketTypes[info.bucketTypeHash];
                                if (itemBucketType == bucketType) {
                                    items.push(item);
                                }
                            }
                        });
                    });
                    _.each(items, function(item){
						self.items.push(new Item(item, self));
					});
                    reloadingBucket = false;
                } else {
                    reloadingBucket = false;
                    self.refresh();
                    return BootstrapDialog.alert("Code 20: " + self.activeText().error_loading_inventory + JSON.stringify(response));
                }
            });
        } else {
            app.bungie.inventory(self.id, function(response) {
                if (response && response.data && response.data.buckets) {

                    var items = [];
                    Object.keys(response.data.buckets).forEach(function(bucket) {
                        response.data.buckets[bucket].forEach(function(obj) {
                            obj.items.forEach(function(item) {
                                var info = window._itemDefs[item.itemHash];
                                if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                                    var itemBucketType = (item.location == 4) ? (item.isEquipment ? "Lost Items" : "Messages") : tgd.DestinyBucketTypes[info.bucketTypeHash];
                                    if (itemBucketType == bucketType) {
                                        items.push(item);
                                    }
                                }
                            });
                        });
                    });
					_.each(items, function(item){
						self.items.push(new Item(item, self));
					});
                    reloadingBucket = false;
                } else {
                    reloadingBucket = false;
                    self.refresh();
                    return BootstrapDialog.alert("Code 30: " + self.activeText().error_loading_inventory + JSON.stringify(response));
                }
            });
        }
    }
	this.init(items);	
}

Profile.prototype = {
	init: function(rawItems){
		var self = this;		
		
		if (_.isString(self.profile)){
			self.order(0);
			self.background(app.makeBackgroundUrl("assets/vault_emblem.jpg", true));
			self.icon(app.makeBackgroundUrl("assets/vault_icon.jpg", true));
			
			self.gender = "Tower";
			self.classType = "Vault";
			self.id = "Vault";
			self.imgIcon = "assets/vault_icon.jpg";
			
			self.level = "";
			self.stats = "";
			self.percentToNextLevel = "";
			self.race = "";
		}
		else {
			self.background(app.makeBackgroundUrl(self.profile.backgroundPath));
			self.icon(app.makeBackgroundUrl(self.profile.emblemPath));
			
			self.gender= tgd.DestinyGender[self.profile.characterBase.genderType];
			self.classType= tgd.DestinyClass[self.profile.characterBase.classType];
			self.id= self.profile.characterBase.characterId;
			self.imgIcon= app.bungie.getUrl() + self.profile.emblemPath;

			self.level= self.profile.characterLevel;
			self.stats= self.profile.characterBase.stats;
			self.percentToNextLevel= self.profile.percentToNextLevel;
			self.race= _raceDefs[self.profile.characterBase.raceHash].raceName;
		}
		self.classLetter = self.classType[0].toUpperCase();
		self.uniqueName = self.level + " " + self.race + " " + self.gender + " " + self.classType
		
		self.items(_.map(rawItems, function(item){
			return new Item(item, self);
		}));
	},
    _weapons: function() {
        return _.filter(this.items(), function(item) {
            if (item.weaponIndex > -1)
                return item;
        });
    },
    _armor: function() {
        return _.filter(this.items(), function(item) {
            if (item.armorIndex > -1)
                return item;
        });
    },
    _general: function() {
        return _.filter(this.items(), function(item) {
            if (item.armorIndex == -1 && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Messages" && item.bucketType !== "Lost Items" && item.bucketType !== "Subclasses")
                return item;
        });
    },
    _postmaster: function() {
        return _.filter(this.items(), function(item) {
            if ((item.bucketType == "Post Master") || (item.bucketType == "Messages") || (item.bucketType == "Lost Items"))
                return item;
        });
    },
    _messages: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Messages")
                return item;
        });
    },
    _lostItems: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Lost Items")
                return item;
        });
    },
    filterItemByType: function(type, isEquipped) {
        return function(item) {
            return (item.bucketType == type && item.isEquipped() == isEquipped);
        }
    },
    get: function(type) {
        return _.sortBy(_.sortBy(this.items().filter(this.filterItemByType(type, false)), function(item) {
            return item.description;
        }), function(item) {
            return item.tierType * -1;
        });
    },
    getVisible: function(type) {
        return _.filter(this.get(type), function(item) {
            return item.isVisible();
        });
    },
    itemEquipped: function(type) {
        return ko.utils.arrayFirst(this.items(), this.filterItemByType(type, true));
    },
    itemEquippedVisible: function(type) {
        var ie = this.itemEquipped(type);
        return ie == undefined ? false : ie.isVisible();
    },
    showStats: function() {
        var character = this;
        if (character && character.stats) {
            var keys = Object.keys(character.stats),
                newStats = [];
            _.each(keys, function(key) {
                var name = key.replace("STAT_", '');
                name = name.substring(0, 1) + name.substring(1, name.length).toLowerCase();
                newStats.push({
                    name: name,
                    value: character.stats[key].value
                });
            });
            (new tgd.dialog).title("Character Stats").content(tgd.statsTemplate({
                stats: newStats
            })).show();
        }
    }
}