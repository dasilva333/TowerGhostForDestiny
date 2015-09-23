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
        if (weights) {
            return Math.floor(sum(_.map(_.filter(self.items(), function(item) {
                return item.isEquipped() && item.bucketType in weights;
            }), function(item) {
                var value = item.primaryStatValue() * (weights[item.bucketType] / 100);
                return value;
            })));
        } else {
            return 0;
        }
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
        var items = this.items().filter(this.filterItemByType(type, false));
        /* Tier, Type */
        if (app.activeSort() == 0) {
            items = _.sortBy(_.sortBy(items, function(item) {
                return item.type;
            }), function(item) {
                return item.tierType * -1;
            });
        }
        /* Type */
        else if (app.activeSort() == 1) {
            items = _.sortBy(items, function(item) {
                return item.type;
            });
        }
        /* Light */
        else if (app.activeSort() == 2) {
            items = _.sortBy(items, function(item) {
                return item.primaryStatValue() * -1;
            });
        }
        /* Damage */
        else if (app.activeSort() == 3) {
            items = _.sortBy(items, function(item) {
                return item.damageType;
            });
        }
        /* Name */
        else if (app.activeSort() == 4) {
            items = _.sortBy(items, function(item) {
                return item.description;
            });
        }

        return items;
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
    },
    equipHighest: function(type) {
        var character = this;
        return function() {
            if (character.id == "Vault") return;

            var items = _.flatten(_.map(app.characters(), function(avatar) {
                return avatar.items()
            }));
            var maxCap = 300;
            var sets = [];
            var backups = [];

            var globalBuckets = ["Ghost"].concat(tgd.DestinyWeaponPieces).concat(tgd.DestinyArmorPieces);
            var buckets = [].concat(globalBuckets);

            _.each(buckets, function(bucket) {
                var candidates = _.filter(items, function(item) {
                    return item.bucketType == bucket 
						&& item.equipRequiredLevel <= character.level 						 
						&& (item.character.id == character.id || (globalBuckets.indexOf(bucket) > -1 && item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType))
						&& ((type == "All" && (item.armorIndex > -1 || item.bucketType == 'Ghost')) || type != "All")
                });
				//console.log(bucket + ":" + _.pluck(candidates,'bucketType'));
                _.each(candidates, function(candidate) {
                    if (type == "Light" || type == "All" || (type != "Light" && candidate.stats[type] > 0) ) {
                        (candidate.tierType == 6 ? sets : backups).push([candidate]);
                    }
                });
            });
							
            backups = _.flatten(backups);

            _.each(backups, function(spare) {
                var candidates = _.filter(backups, function(item) {
                    return item.bucketType == spare.bucketType && item._id != spare._id;
                });
                primaryStats = _.map(candidates, function(item) {
                    return item.getValue(type);
                });
                var maxCandidate = Math.max.apply(null, primaryStats);
                if (maxCandidate < spare.getValue(type)) {
                    sets.push([spare]);
                }
            });

            _.each(sets, function(set) {
                var main = set[0];
                _.each(buckets, function(bucket) {
                    if (bucket != main.bucketType) {
                        /* TODO: Investigate if it's possible to generate a set w 2 exotics w/o adding a filter here */
                        var candidates = _.where(backups, {
                            bucketType: bucket
                        });
                        if (candidates.length > 0) {
                            primaryStats = _.map(candidates, function(item) {
                                return item.getValue(type);
                            });
                            var maxCandidate = Math.max.apply(null, primaryStats);
                            var candidate = candidates[primaryStats.indexOf(maxCandidate)];
                            set.push(candidate);
                        }
                    }
                });
            });
            var sumSets = _.map(sets, function(set) {
                return sum(_.map(set, function(item) {
                    return item.getValue(type);
                }));
            });
			

            var highestSetValue = Math.max.apply(null, sumSets);

			//console.log("highestSetValue: " + highestSetValue);
			
            if (type == "Light" || type == "All") {
                highestSet = _.sortBy(sets[sumSets.indexOf(highestSetValue)], function(item) {
                    return item.tierType * -1;
                });
            } else if (type != "Light") {
                tgd.localLog("type changed is not light");
                if (highestSetValue < maxCap) {
                    tgd.localLog("highest set is below max cap");
                    highestSet = _.sortBy(sets[sumSets.indexOf(highestSetValue)], function(item) {
                        return item.tierType * -1;
                    });
                } else {
                    tgd.localLog("highest set is above max cap");
                    var fullSets = [];
                    var alternatives = [];
                    _.each(buckets, function(bucket) {
                        var candidates = _.filter(items, function(item) {
                            return _.isObject(item.stats) && item.bucketType == bucket && item.equipRequiredLevel <= character.level &&
                                (item.character.id == character.id || globalBuckets.indexOf(bucket) > -1) && 
								item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType;
                        });
                        tgd.localLog("candidates considering " + candidates.length);
                        _.each(candidates, function(candidate) {
                            if (candidate.stats[type] > 0) {
                                tgd.localLog(candidate);
                                fullSets.push([candidate]);
                            } else {
                                alternatives.push([candidate]);
                            }
                        });
                    });
                    tgd.localLog("full sets considering " + fullSets.length);
                    //tgd.localLog( fullSets );
                    var statAlternatives = _.flatten(fullSets);
                    tgd.localLog("full sets considering " + fullSets.length);
                    _.each(fullSets, function(set) {
                        var mainItem = set[0];
                        var currentStat = mainItem.stats[type];
                        tgd.localLog(currentStat + " for main item: " + mainItem.description);
                        _.each(buckets, function(bucket) {
                            if (bucket != mainItem.bucketType) {
                                if (currentStat < maxCap) {
                                    var candidates = _.filter(statAlternatives, function(item) {
                                        return item.bucketType == bucket &&
                                            ((item.tierType != 6 && mainItem.tierType == 6) || (item.tierType == 6 && mainItem.tierType != 6));
                                    });
                                    if (candidates.length > 0) {
                                        var primaryStats = _.map(candidates, function(item) {
                                            return item.stats[type]
                                        });
                                        tgd.localLog(bucket + " choices are " + primaryStats);
                                        var maxCandidateValue = Math.max.apply(null, primaryStats);
                                        maxCandidate = candidates[primaryStats.indexOf(maxCandidateValue)];
                                        var deltas = {};
                                        _.each(candidates, function(candidate, index) {
                                            tgd.localLog(candidate.description + " considering candidate currentStat " + candidate.stats[type]);
                                            var delta = ((currentStat + candidate.stats[type]) - maxCap);
                                            if (delta >= 0) {
                                                var allStatsSummed = ((currentStat + sum(_.values(candidate.stats))) - candidate.stats[type] - maxCap);
                                                if (allStatsSummed >= 0) {
                                                    deltas[index] = allStatsSummed;
                                                }
                                            }
                                            //tgd.localLog("new currentStat is " + currentStat);

                                        });
                                        var values = _.values(deltas),
                                            keys = _.keys(deltas);
                                        if (values.length > 0) {
                                            maxCandidate = candidates[keys[values.indexOf(Math.max.apply(null, values))]];
                                            tgd.localLog(" new max candidate is " + maxCandidate.description);
                                        }
                                        currentStat += maxCandidate.stats[type];
                                        tgd.localLog("new currentStat is " + currentStat);
                                        set.push(maxCandidate);
                                    }
                                } else {
                                    tgd.localLog("adding alternative maxCap is full on this set");
                                    var candidates = _.filter(alternatives, function(item) {
                                        return item.bucketType == bucket;
                                    });
                                    if (candidates.length > 0) {
                                        set.push(candidates[0]);
                                    }
                                }
                            }
                        });
                    });
                    var availableSets = [],
                        availableSumSets = [];
                    _.map(fullSets, function(set) {
                        var arrStats = _.pluck(set, 'stats');
                        var sumSet = _.reduce(arrStats, function(memo, stat) {
                            var tmp = _.extend({}, memo);
                            //tgd.localLog("old memo " + JSON.stringify(tmp));
                            _.each(stat, function(value, key) {
                                //tgd.localLog(key + " value: " + value);
                                tmp[key] = parseInt(memo[key]) + parseInt(value);
                            });
                            _.each(tmp, function(value, key) {
                                    if (!(value >= 0)) tmp[key] = 0;
                                })
                                //tgd.localLog("new memo " + JSON.stringify(tmp));
                            return tmp;
                        });
                        if (sumSet[type] > maxCap) {
                            availableSumSets.push(sumSet);
                            availableSets.push(set);
                        }
                        tgd.localLog(sumSet);
                    });
                    var sumSetValues = _.map(availableSumSets, function(set) {
                        return sum(_.values(set))
                    });
                    highestSetValue = Math.max.apply(null, sumSetValues);
                    highestSet = availableSets[sumSetValues.indexOf(highestSetValue)];
                }
                $.toaster({
                    priority: 'success',
                    title: 'Result:',
                    message: " The highest set available for " + type + "  is  " + highestSetValue
                });
            }

            var count = 0;
            var done = function() {
                count++;
                if (count == highestSet.length) {
                    var msa = adhoc.transfer(character.id, true);
                    adhoc.swapItems(msa, character.id, function() {
                        console.log("xfer complete");
                    });
                }
            }
            var adhoc = new Loadout();
            _.each(highestSet, function(candidate) {
                var itemEquipped = character.itemEquipped(candidate.bucketType);
                if (itemEquipped && itemEquipped._id && itemEquipped._id !== candidate._id) {
                    adhoc.addUniqueItem({
                        id: candidate._id,
                        bucketType: candidate.bucketType,
                        doEquip: true
                    });
                    $.toaster({
                        priority: 'info',
                        title: 'Equip:',
                        message: candidate.bucketType + " can have a better item with " + candidate.description
                    });
                    done();
                } else {
                    done();
                }
            });
        }
    }
}