function sum(arr) {
    return _.reduce(arr, function(memo, num) {
        return memo + num;
    }, 0);
}

var Profile = function(character, items, index) {
    var self = this;

    this.profile = character;
    this.order = ko.observable();
    this.icon = ko.observable("");
    this.background = ko.observable("");
    this.items = ko.observableArray().extend({
        rateLimit: {
            timeout: 500,
            method: "notifyWhenChangesStop"
        }
    });
    this.uniqueName = "";
    this.classLetter = "";
    this.race = "";
    this.reloadingBucket = false;
    this.statsShowing = ko.observable(false);
    this.weapons = ko.computed(this._weapons, this);
    this.armor = ko.computed(this._armor, this);
    this.general = ko.computed(this._general, this);
    this.postmaster = ko.computed(this._postmaster, this);
    this.messages = ko.computed(this._messages, this);
    this.invisible = ko.computed(this._invisible, this);
    this.lostItems = ko.computed(this._lostItems, this);
    this.powerLevel = ko.computed(this._powerLevel, this);
    this.iconBG = ko.computed(function() {
        return app.makeBackgroundUrl(self.icon(), true);
    });
	this.equipHighest = function(type){
		var character = this;
		return function(){
			if (self.id == "Vault") return;

			var items = character.items();
			var sets = [];
			var backups = [];

			var buckets = _.clone(tgd.DestinyArmorPieces).concat(tgd.DestinyWeaponPieces);
			_.each( buckets, function(bucket){
				var candidates = _.where( items, { bucketType: bucket });
                _.each(candidates, function(candidate){
                     if ( type == "Light" || (type != "Light" && candidate.stats[type] > 0) ){
                          (candidate.tierType == 6 ? sets : backups).push([candidate]);
                     }
                 });
			});
			
			backups = _.flatten(backups);
			
			_.each( backups, function(spare){
				var candidates = _.filter( backups, function(item){
					 return item.bucketType == spare.bucketType && item._id != spare._id;
				});
				primaryStats = _.map( candidates, function(item){ return (type == "Light") ? item.primaryStat() : item.stats[type] });
				var maxCandidate = Math.max.apply(null, primaryStats);
				if (maxCandidate < ((type == "Light") ? spare.primaryStat() : spare.stats[type])){
					sets.push([spare]);
				}
			});

			_.each( sets, function(set){
			   var exotic = set[0];
			   _.each( buckets, function(bucket){
					if (bucket != exotic.bucketType){
						var candidates = _.where( backups, { bucketType: bucket});
						if (candidates.length > 0){
						   primaryStats = _.map( candidates, function(item){ return (type == "Light") ? item.primaryStat() : item.stats[type] });
						   var maxCandidate = Math.max.apply(null, primaryStats);
						   var candidate = candidates[primaryStats.indexOf(maxCandidate)];
						   set.push(candidate);
						}
					}
			   });
			});
			var sumSets = _.map( sets, function(set){
				return sum(_.map( set, function(item){
					  return (type == "Light") ? item.primaryStat() : item.stats[type];
				 }));
			});
			
			var highestSet = Math.max.apply(null, sumSets);
			highestSet = sets[sumSets.indexOf(highestSet)];

			_.each(highestSet, function(candidate){
				$.toaster({
					priority: 'info',
					title: 'Equip:',
					message: candidate.bucketType + " can have a better item with " + candidate.description
				});
				candidate.equip( character.id );
			});
		}
	}
    this.container = ko.observable();
    this.lostItemsHelper = [420519466, 1322081400, 2551875383, 398517733, 583698483, 937555249];
    this.invisibleItemsHelper = [2910404660, 2537120989];
    this.reloadBucket = _.bind(this._reloadBucket, this);
    this.init(items, index);
}

Profile.prototype = {
    init: function(rawItems, index) {
        var self = this;

        if (_.isString(self.profile)) {
            self.order(parseInt(app.vaultPos()));
            self.background(app.makeBackgroundUrl("assets/vault_emblem.jpg", true));
            self.icon("assets/vault_icon.jpg");

            self.gender = "Tower";
            self.classType = "Vault";
            self.id = "Vault";

            self.level = "";
            self.stats = "";
            self.percentToNextLevel = "";
            self.race = "";
        } else {
            self.order(index);
            self.background(app.makeBackgroundUrl(tgd.dataDir + self.profile.backgroundPath, true));
            self.icon(tgd.dataDir + self.profile.emblemPath);

            self.gender = tgd.DestinyGender[self.profile.characterBase.genderType];
            self.classType = tgd.DestinyClass[self.profile.characterBase.classType];
            self.id = self.profile.characterBase.characterId;

            self.level = self.profile.characterLevel;
            self.stats = self.profile.characterBase.stats;
            if (!("STAT_LIGHT" in self.stats))
                self.stats.STAT_LIGHT = 0;
            self.percentToNextLevel = self.profile.percentToNextLevel;
            self.race = _raceDefs[self.profile.characterBase.raceHash].raceName;
        }
        self.classLetter = self.classType[0].toUpperCase();
        self.uniqueName = self.level + " " + self.race + " " + self.gender + " " + self.classType

        var processedItems = [];
        _.each(rawItems, function(item) {
            var processedItem = new Item(item, self);
            if ("id" in processedItem) processedItems.push(processedItem);
        });
        self.items(processedItems);
    },
    getBucketTypeHelper: function(item, info) {
        var self = this;
        if (typeof info == "undefined") {
            return "";
        }
        if (item.location !== 4) {
            return tgd.DestinyBucketTypes[info.bucketTypeHash];
        }
        if (item.isEquipment || self.lostItemsHelper.indexOf(item.itemHash) > -1 || (item.location == 4 && item.itemInstanceId > 0)) {
            return "Lost Items";
        }
        if (self.invisibleItemsHelper.indexOf(item.itemHash) > -1) {
            return "Invisible";
        }
        return "Messages";
    },
    reloadBucketFilter: function(buckets) {
        var self = this;
        return function(item) {
            var info = window._itemDefs[item.itemHash];
            if (info && info.bucketTypeHash) {
                if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                    var itemBucketType = self.getBucketTypeHelper(item, info);
                    if (buckets.indexOf(itemBucketType) > -1) {
                        return true;
                    }
                }
            }
        }
    },
    reloadBucketHandler: function(buckets, done) {
        var self = this;
        return function(results, response) {
            if (results && results.data && results.data.buckets) {
                var items = _.filter(app.bungie.flattenItemArray(results.data.buckets), self.reloadBucketFilter(buckets));
                _.each(items, function(item) {
                    self.items.push(new Item(item, self, true));
                });
                done();
            } else {
                done();
                app.refresh();
                return BootstrapDialog.alert("Code 20: " + app.activeText().error_loading_inventory + JSON.stringify(response));
            }
        }
    },
    _powerLevel: function() {
        var self = this;
        var index = self.items().filter(self.filterItemByType("Artifact", true)).length;
        var weights = tgd.DestinyBucketWeights[index];
        return Math.floor(sum(_.map(_.filter(self.armor().concat(self.weapons()), function(item) {
            return item.isEquipped()
        }), function(item) {
            var value = item.primaryStat() * (weights[item.bucketType] / 100);
            return value;
        })));
    },
    _reloadBucket: function(model, event, callback) {
        var self = this,
            element;
        if (self.reloadingBucket) {
            return;
        }

        var buckets = [];
        if (typeof model === 'string' || model instanceof String) {
            buckets.push(model);
        } else if (model instanceof Layout) {
            buckets.push.apply(buckets, model.bucketTypes);
        } else if (model instanceof Profile) {
            _.each(tgd.DestinyLayout, function(layout) {
                buckets.push.apply(buckets, layout.bucketTypes);
            });
        }

        self.reloadingBucket = true;
        if (typeof event !== "undefined") {
            element = $(event.target).is(".fa") ? $(event.target) : $(event.target).find(".fa");
            if (element.is(".fa") == false) {
                element = $(event.target).is(".emblem") ? $(event.target) : $(event.target).find(".emblem");
                if (element.is(".emblem") == false) {
                    element = $(event.target).parent().find(".emblem");
                }
            }
            element.addClass("fa-spin");
        }

        var needsInvisibleRefresh = buckets.indexOf("Invisible") > -1;

        function done() {
            function reallyDone() {
                self.reloadingBucket = false;
                if (element) {
                    element.removeClass("fa-spin");
                }
            }

            if (needsInvisibleRefresh) {
                app.bungie.account(function(results, response) {
                    if (results && results.data && results.data.inventory && results.data.inventory.buckets && results.data.inventory.buckets.Invisible) {
                        var invisible = results.data.inventory.buckets.Invisible;
                        invisible.forEach(function(b) {
                            b.items.forEach(function(item) {
                                self.items.push(new Item(item, self, true));
                            });
                        });
                        reallyDone();
                    } else {
                        reallyDone();
                        app.refresh();
                        return BootstrapDialog.alert("Code 40: " + app.activeText().error_loading_inventory + JSON.stringify(response));
                    }
                });
            } else {
                reallyDone();
            }
            if (callback)
                callback();
        }

        var itemsToRemove = _.filter(self.items(), function(item) {
            return buckets.indexOf(item.bucketType) > -1;
        });
        self.items.removeAll(itemsToRemove);

        if (self.id == "Vault") {
            app.bungie.vault(self.reloadBucketHandler(buckets, done));
        } else {
            app.bungie.inventory(self.id, self.reloadBucketHandler(buckets, done));
        }
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
            if (item.armorIndex == -1 && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Messages" && item.bucketType !== "Invisible" && item.bucketType !== "Lost Items" && item.bucketType !== "Subclasses")
                return item;
        });
    },
    _postmaster: function() {
        return _.filter(this.items(), function(item) {
            if ((item.bucketType == "Post Master") || (item.bucketType == "Messages") || (item.bucketType == "Invisible") || (item.bucketType == "Lost Items"))
                return item;
        });
    },
    _messages: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Messages")
                return item;
        });
    },
    _invisible: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Invisible")
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
            return item.type;
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
    toggleStats: function() {
        this.statsShowing(!this.statsShowing());
    }
}