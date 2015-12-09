function Profile(character) {
    var self = this;

    this.id = character.characterBase.characterId;
    this.order = ko.observable(character.index);
    this.icon = ko.observable("");
    this.gender = ko.observable("");
    this.classType = ko.observable("");
    this.level = ko.observable("");
    this.stats = ko.observable("");
    this.race = ko.observable("");
    this.percentToNextLevel = ko.observable("");
    this.background = ko.observable("");
    this.items = ko.observableArray().extend({
        rateLimit: {
            timeout: 500,
            method: "notifyWhenChangesStop"
        }
    });
    this.items.subscribe(app.redraw);
    this.reloadingBucket = false;
    this.statsShowing = ko.observable(false);
    this.weapons = ko.pureComputed(this._weapons, this);
    this.armor = ko.pureComputed(this._armor, this);
    this.general = ko.pureComputed(this._general, this);
    this.invisible = ko.pureComputed(this._invisible, this);
    this.lostItems = ko.pureComputed(this._lostItems, this);
    this.equippedGear = ko.pureComputed(this._equippedGear, this);
    this.equippedStats = ko.pureComputed(this._equippedStats, this);
    this.powerLevel = ko.pureComputed(this._powerLevel, this);
    this.classLetter = ko.pureComputed(this._classLetter, this);
    this.uniqueName = ko.pureComputed(this._uniqueName, this);
    this.iconBG = ko.pureComputed(function() {
        return app.makeBackgroundUrl(self.icon(), true);
    });
    this.container = ko.observable();
    this.lostItemsHelper = [420519466, 1322081400, 2551875383, 398517733, 583698483, 937555249];
    this.invisibleItemsHelper = [2910404660, 2537120989];
    this.reloadBucket = _.bind(this._reloadBucket, this);
    this.init(character);

    this.weapons.subscribe(app.addWeaponTypes);
    this.items.subscribe(app.addTierTypes);
}

Profile.prototype = {
    init: function(profile) {
        var self = this;

        if (self.id == "Vault") {
            self.background(app.makeBackgroundUrl("assets/vault_emblem.jpg", true));
            self.icon("assets/vault_icon.jpg");
            self.gender("Tower");
            self.classType("Vault");
        } else {
            self.updateCharacter(profile);
        }
        var processedItems = [];
        _.each(profile.items, function(item) {
            var processedItem = new Item(item, self);
            if ("id" in processedItem) processedItems.push(processedItem);
        });

        self.items(processedItems);
        if (self.id != "Vault" && typeof profile.processed == "undefined") {
            self._reloadBucket(self, undefined, function() {}, true);
        }
    },
    updateCharacter: function(profile) {
        var self = this;
        if (profile && profile.processed) {
            self.background(profile.characterBase.background);
            self.icon(profile.characterBase.icon);
            self.gender(profile.characterBase.gender);
            self.classType(profile.characterBase.classType);
            self.level(profile.characterBase.level);
            self.stats(profile.characterBase.stats);
            self.race(profile.characterBase.race);
            self.percentToNextLevel(0);
        } else {
            self.background(app.makeBackgroundUrl(tgd.dataDir + profile.backgroundPath, true));
            self.icon(tgd.dataDir + profile.emblemPath);
            self.gender(tgd.DestinyGender[profile.characterBase.genderType]);
            self.classType(tgd.DestinyClass[profile.characterBase.classType]);
            self.level(profile.characterLevel);
            self.stats(profile.characterBase.stats);
            if (!("STAT_LIGHT" in self.stats()))
                self.stats()['STAT_LIGHT'] = 0;
            self.percentToNextLevel(profile.percentToNextLevel);
            self.race(_raceDefs[profile.characterBase.raceHash].raceName);
        }
    },
    refresh: function(profile, event) {
        var self = this;
        if (self.id == "Vault") {
            self._reloadBucket(self, event);
        } else {
            app.bungie.character(self.id, function(result) {
                if (result && result.data) {
                    self.updateCharacter(result.data);
                    self._reloadBucket(self, event);
                }
            });
        }
    },
    getBucketTypeHelper: function(item, info) {
        var self = this;
        if (typeof info == "undefined") {
            return "";
        } else if (item.location !== 4) {
            return tgd.DestinyBucketTypes[info.bucketTypeHash];
        } else if (item.isEquipment || self.lostItemsHelper.indexOf(item.itemHash) > -1 || (item.location == 4 && item.itemInstanceId > 0)) {
            return "Lost Items";
        } else if (self.invisibleItemsHelper.indexOf(item.itemHash) > -1) {
            return "Invisible";
        }
        return "Messages";
    },
    reloadBucketFilter: function(buckets) {
        var self = this;
        return function(item) {
            var info = {};
            if (item.itemHash in _itemDefs) {
                info = _itemDefs[item.itemHash];
            } else {
                /* Classified Items */
                info = {
                    bucketTypeHash: "1498876634",
                    itemName: "Classified",
                    tierTypeName: "Exotic",
                    icon: "/img/misc/missing_icon.png",
                    itemTypeName: "Classified"
                };
            }
            if (info && info.bucketTypeHash) {
                if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
                    var itemBucketType = self.getBucketTypeHelper(item, info);
                    if (buckets.indexOf(itemBucketType) > -1) {
                        return true;
                    }
                }
                /*else {
					console.log( unescape(info.itemName) + " " + info.bucketTypeHash );
				}*/
            }
        };
    },
    reloadBucketHandler: function(buckets, done) {
        var self = this;
        return function(results, response) {
            if (results && results.data && results.data.buckets) {
                var items = _.filter(app.bungie.flattenItemArray(results.data.buckets), self.reloadBucketFilter(buckets));
                _.each(items, function(item) {
                    var processedItem = new Item(item, self);
                    if ("id" in processedItem) self.items.push(processedItem);
                });
                done();
            } else {
                done();
                app.refresh();
                return BootstrapDialog.alert("Code 20: " + app.activeText().error_loading_inventory + JSON.stringify(response));
            }
        };
    },
    calculatePowerLevelWithItems: function(items) {
        if (items.length === 0) {
            return 0;
        }
        var index = items.filter(this.filterItemByType("Artifact", true)).length;
        var weights = tgd.DestinyBucketWeights[index];
        if (weights) {
            var eligibleGear = _.filter(items, function(item) {
                return item.bucketType in weights;
            });
            var primaryStatsGear = _.map(eligibleGear, function(item) {
                var value = item.primaryStatValue() * (weights[item.bucketType] / 100);
                return value;
            });
            var sumLightGear = tgd.sum(primaryStatsGear);
            var powerLevel = Math.floor(sumLightGear);
            return powerLevel;
        } else {
            return 0;
        }
    },
    _equippedGear: function() {
        return _.filter(this.items(), function(item) {
            return item.isEquipped();
        });
    },
    _equippedStats: function() {
        return this.joinStats(this.equippedGear());
    },
    _classLetter: function() {
        return this.classType()[0].toUpperCase();
    },
    _uniqueName: function() {
        return this.level() + " " + this.race() + " " + this.gender() + " " + this.classType();
    },
    _powerLevel: function() {
        if (this.id == "Vault") return "";
        return this.calculatePowerLevelWithItems(this.equippedGear());
    },
    _reloadBucket: function(model, event, callback, excludeMessage) {
        var self = this,
            element;
        if (self.reloadingBucket) {
            return;
        }

        if (!excludeMessage)
            $.toaster({
                priority: 'info',
                title: 'Success',
                message: 'Refreshing ' + self.uniqueName()
            });

        var buckets = [];
        if (typeof model === 'string' || model instanceof String) {
            buckets.push(model);
        } else if (model instanceof tgd.Layout) {
            buckets.push.apply(buckets, model.bucketTypes);
        } else if (model instanceof Profile) {
            _.each(tgd.DestinyLayout, function(layout) {
                buckets.push.apply(buckets, layout.bucketTypes);
            });
            buckets.splice(buckets.indexOf("Invisible"), 1);
        }

        self.reloadingBucket = true;
        if (typeof event !== "undefined") {
            element = $(event.target).is(".fa") ? $(event.target) : $(event.target).find(".fa");
            if (element.is(".fa") === false) {
                element = $(event.target).is(".emblem") ? $(event.target) : $(event.target).find(".emblem");
                if (element.is(".emblem") === false) {
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
                if (!excludeMessage)
                    $.toaster({
                        priority: 'info',
                        title: 'Success',
                        message: 'Refresh completed for ' + self.uniqueName()
                    });
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
            if (item.armorIndex > -1 && tgd.DestinyGeneralExceptions.indexOf(item.bucketType) == -1)
                return item;
        });
    },
    _general: function() {
        return _.filter(this.items(), function(item) {
            if ((item.armorIndex == -1 || tgd.DestinyGeneralExceptions.indexOf(item.bucketType) > -1) && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Messages" && item.bucketType !== "Invisible" && item.bucketType !== "Lost Items" && item.bucketType !== "Subclasses")
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
        };
    },
    get: function(type) {
        var items = this.items().filter(this.filterItemByType(type, false));
        var activeSort = parseInt(app.activeSort());
        /* Tier, Type */
        if (activeSort === 0) {
            items = _.sortBy(_.sortBy(items, function(item) {
                return item.type;
            }), function(item) {
                return item.tierType * -1;
            });
        }
        /* Type */
        else if (activeSort === 1) {
            items = _.sortBy(items, function(item) {
                return item.type;
            });
        }
        /* Light */
        else if (activeSort === 2) {
            items = _.sortBy(items, function(item) {
                return item.primaryStatValue() * -1;
            });
        }
        /* Damage */
        else if (activeSort === 3) {
            items = _.sortBy(items, function(item) {
                return item.damageType;
            });
        }
        /* Name */
        else if (activeSort === 4) {
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
        return _.isEmpty(ie) ? false : ie.isVisible();
    },
    toggleStats: function() {
        this.statsShowing(!this.statsShowing());
    },
    joinStats: function(arrItems) {
        var tmp = {};
        _.each(arrItems, function(item) {
            _.each(item.stats, function(value, key) {
                if (!(key in tmp)) tmp[key] = 0;
                tmp[key] += value;
            });
        });
        return tmp;
    },
    reduceMaxSkill: function(type, buckets, items) {
        var character = this;
        tgd.localLog("highest set is above max cap");
        var fullSets = [];
        var alternatives = [];
        _.each(buckets, function(bucket) {
            candidates = _.filter(items, function(item) {
                return _.isObject(item.stats) && item.bucketType == bucket && item.equipRequiredLevel <= character.level() && item.canEquip === true && (
                    (item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType === 3 && item.armorIndex > -1 && item.typeName.indexOf(character.classType()) > -1) || (item.weaponIndex > -1) || item.bucketType == "Ghost"
                );
            });
            tgd.localLog("candidates considering " + candidates.length);
            _.each(candidates, function(candidate) {
                if (candidate.stats[type] > 0) {
                    //tgd.localLog(candidate);
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
                    if (currentStat < tgd.DestinySkillCap) {
                        candidates = _.filter(statAlternatives, function(item) {
                            return item.bucketType == bucket &&
                                ((item.tierType != 6 && mainItem.tierType == 6) || (mainItem.tierType != 6));
                        });
                        if (candidates.length > 0) {
                            primaryStats = _.map(candidates, function(item) {
                                return item.stats[type];
                            });
                            tgd.localLog(bucket + " choices are " + primaryStats);
                            var maxCandidateValue = _.max(primaryStats);
                            maxCandidate = candidates[primaryStats.indexOf(maxCandidateValue)];
                            var deltas = {};
                            _.each(candidates, function(candidate, index) {
                                tgd.localLog(candidate.description + " considering candidate currentStat " + candidate.stats[type]);
                                var delta = ((currentStat + candidate.stats[type]) - tgd.DestinySkillCap);
                                if (delta >= 0) {
                                    var allStatsSummed = ((currentStat + candidate.getValue("All")) - candidate.stats[type] - tgd.DestinySkillCap);
                                    if (allStatsSummed >= 0) {
                                        deltas[index] = allStatsSummed;
                                    }
                                }
                                //tgd.localLog("new currentStat is " + currentStat);

                            });
                            var values = _.values(deltas),
                                keys = _.keys(deltas);
                            if (values.length > 0) {
                                maxCandidate = candidates[keys[values.indexOf(_.min(values))]];
                                tgd.localLog(" new max candidate is " + maxCandidate.description);
                            }
                            currentStat += maxCandidate.stats[type];
                            tgd.localLog("new currentStat is " + currentStat);
                            set.push(maxCandidate);
                        }
                    } else {
                        tgd.localLog("adding alternative, maxCap is full on this set");
                        candidates = _.filter(alternatives, function(item) {
                            return item.bucketType == bucket;
                        });
                        if (candidates.length > 0) {
                            primaryStats = _.map(candidates, function(item) {
                                return item.getValue("All");
                            });
                            set.push(candidates[primaryStats.indexOf(_.max(primaryStats))]);
                        }
                    }
                }
            });
        });
        var availableSets = [];
        _.map(fullSets, function(set) {
            var sumSet = character.joinStats(set);
            if (sumSet[type] >= tgd.DestinySkillCap) {
                availableSets.push({
                    set: set,
                    sumSet: sumSet
                });
                tgd.localLog(sumSet);
            }
        });
        var sumSetValues = _.sortBy(_.map(availableSets, function(combo) {
            var score = tgd.sum(_.map(combo.sumSet, function(value, key) {
                var result = Math.floor(value / 60);
                return result > 5 ? 5 : result;
            }));
            combo.sum = tgd.sum(_.values(combo.sumSet));
            var subScore = (combo.sum / 1000);
            combo.score = score + subScore;
            return combo;
        }), 'score');
        var highestSetObj = sumSetValues[sumSetValues.length - 1];
        return [highestSetObj.sum, highestSetObj.set];
    },
    findBestArmorSet: function(items) {
        var buckets = [].concat(tgd.DestinyArmorPieces);
        var sets = [],
            bestSets = [],
            backups = [],
            candidates;
        var character = this;

        //console.time("finding candidates");
        _.each(buckets, function(bucket) {
            candidates = _.filter(items, function(item) {
                return item.bucketType == bucket && item.equipRequiredLevel <= character.level() && item.canEquip === true && (
                    (item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType == 3 && item.armorIndex > -1 && item.typeName.indexOf(character.classType()) > -1) || (item.weaponIndex > -1) || item.bucketType == "Ghost"
                );
            });
            tgd.localLog(bucket + " total candidates " + candidates.length);
            _.each(candidates, function(candidate) {
                sets.push([candidate]);
            });
        });

        tgd.localLog("total sets " + sets.length);
        backups = _.flatten(sets);

        _.each(sets, function(set) {
            var mainPiece = set[0],
                subSets = [
                    [mainPiece]
                ];
            candidates = _.groupBy(_.filter(backups, function(item) {
                return item.bucketType != mainPiece.bucketType && ((item.tierType != 6 && mainPiece.tierType == 6) || (mainPiece.tierType != 6)) && mainPiece._id != item._id;
            }), 'bucketType');
            _.each(candidates, function(items) {
                subSets.push(items);
            });
            var combos = tgd.cartesianProductOf(subSets);
            var sums = _.map(combos, function(combo) {
                var tmp = character.joinStats(combo);
                var score = tgd.sum(_.map(tmp, function(value, key) {
                    var result = Math.floor(value / 60);
                    return result > 5 ? 5 : result;
                }));
                var subScore = (tgd.sum(_.values(tmp)) / 1000);
                return score + subScore;
            });
            var highestScore = _.max(sums);
            var highestScoringSet = combos[sums.indexOf(highestScore)];
            bestSets.push({
                score: highestScore,
                set: highestScoringSet
            });
        });

        return _.sortBy(bestSets, 'score');
    },
    findHighestItemBy: function(type, buckets, items) {
        var character = this;
        var sets = [];
        var backups = [];
        var primaryStats;
        var candidates;

        _.each(buckets, function(bucket) {
            candidates = _.filter(items, function(item) {
                return item.bucketType == bucket && item.equipRequiredLevel <= character.level() && item.canEquip === true && ((item.classType != 3 && tgd.DestinyClass[item.classType] == character.classType()) || (item.classType == 3 && item.armorIndex > -1) || (item.weaponIndex > -1)) && ((type == "All" && item.armorIndex > -1) || type != "All");
            });
            //console.log("bucket: " + bucket);
            //console.log(candidates);
            _.each(candidates, function(candidate) {
                if (type == "Light" || type == "All" || (type != "Light" && candidate.stats[type] > 0)) {
                    (candidate.tierType == 6 && candidate.hasLifeExotic == false ? sets : backups)[candidate.isEquipped() ? "unshift" : "push"]([candidate]);
                }
            });
        });

        backups = _.flatten(backups);

        //console.log("backups");
        //console.log(backups);

        _.each(backups, function(spare) {
            candidates = _.filter(backups, function(item) {
                return item.bucketType == spare.bucketType && ((spare.tierType != 6) || (spare.tierType == 6 && item.tierType != 6)) && item._id != spare._id;
            });
            primaryStats = _.map(candidates, function(item) {
                return item.getValue(type);
            });
            var maxCandidate = _.max(primaryStats);
            if (maxCandidate < spare.getValue(type)) {
                //console.log("adding backup " + spare.description);
                sets.push([spare]);
            }
        });

        //console.log("sets");
        //console.log(sets);

        _.each(sets, function(set) {
            var main = set[0];
            //console.log("main set item " + main.description);

            _.each(buckets, function(bucket) {
                if (bucket != main.bucketType) {
                    candidates = _.where(backups, {
                        bucketType: bucket
                    });
                    tgd.localLog(candidates.length + " best candidate for bucket: " + bucket);
                    //console.log("candidates: " + _.pluck(candidates,'description'));
                    if (candidates.length > 0) {
                        primaryStats = _.map(candidates, function(item) {
                            return item.getValue(type);
                        });
                        //console.log(primaryStats);
                        var maxCandidate = _.max(primaryStats);
                        var candidate = candidates[primaryStats.indexOf(maxCandidate)];
                        //console.log("winner: " + candidate.description);
                        set.push(candidate);
                    }
                }
            });
        });
        var sumSets = _.map(sets, function(set) {
            return tgd.sum(_.map(set, function(item) {
                return item.getValue(type);
            }));
        });

        highestSetValue = _.max(sumSets);
        highestSet = _.sortBy(sets[sumSets.indexOf(highestSetValue)], function(item) {
            return item.tierType * -1;
        });
        return [highestSetValue, highestSet];
    },
    equipAction: function(type, highestSetValue, highestSet) {
        var character = this;

        $.toaster({
            settings: {
                timeout: 10 * 1000
            }
        });

        $.toaster({
            priority: 'success',
            title: 'Result',
            message: " The highest set available for " + type + "  is  " + highestSetValue
        });

        var count = 0;
        var done = function() {
            count++;
            if (count == highestSet.length) {
                var msa = adhoc.transfer(character.id, true);
                tgd.localLog(msa);
                adhoc.swapItems(msa, character.id, function() {
                    $.toaster({
                        priority: 'success',
                        title: 'Result',
                        message: " Completed equipping the highest " + type + " set at " + highestSetValue
                    });
                    $.toaster.reset();
                });
            }
        };
        //console.log(highestSet); abort;

        var adhoc = new tgd.Loadout();
        _.each(highestSet, function(candidate) {
            var itemEquipped = character.itemEquipped(candidate.bucketType);
            if (itemEquipped && itemEquipped._id && itemEquipped._id !== candidate._id) {
                if ((type == "Light" && candidate.primaryStatValue() > itemEquipped.primaryStatValue()) || type != "Light") {
                    adhoc.addUniqueItem({
                        id: candidate._id,
                        bucketType: candidate.bucketType,
                        doEquip: true
                    });
                    var message = candidate.bucketType + " can have a better item with " + candidate.description;
                    tgd.localLog(message);
                } else {
                    var message = candidate.description + " skipped because the equipped item (" + itemEquipped.description + ") is equal or greater light";
                }
                $.toaster({
                    priority: 'info',
                    title: 'Equip',
                    message: message
                });
                done();
            } else {
                done();
            }
        });
    },
    equipHighest: function(type) {
        var character = this;
        return function() {
            if (character.id == "Vault") return;

            var armor = [].concat(tgd.DestinyArmorPieces);
            var weapons = tgd.DestinyWeaponPieces;
            var items = _.flatten(_.map(app.characters(), function(avatar) {
                return avatar.items();
            }));

            var highestSet;
            var highestSetValue;
            var bestArmorSets;
            var bestWeaponSets;

            if (type == "Best") {
                var bestSets = character.findBestArmorSet(items);
                var highestTier = Math.floor(_.max(_.pluck(bestSets, 'score'))),
                    armorBuilds = {};
                _.each(bestSets, function(combo) {
                    if (combo.score >= highestTier) {
                        var title, description = "",
                            stats = character.joinStats(combo.set);
                        combo.stats = [];
                        _.each(stats, function(stat, name) {
                            description = description + " <strong>" + name.substring(0, 3) + "</strong> T" + Math.floor(stat / 60);
                            combo.stats.push(stat);
                        });
                        combo.title = $.trim(description);
                        if (combo.title in armorBuilds && combo.score > armorBuilds[combo.title].score || !(combo.title in armorBuilds)) {
                            armorBuilds[combo.title] = combo;
                        }
                    }
                });
                armorBuilds = _.sortBy(armorBuilds, function(combo) {
                    return _.max(combo.stats) * -1;
                });
                if (armorBuilds.length === 1) {
                    highestSet = bestSets[bestSets.length - 1].set;
                    highestSetValue = bestSets[bestSets.length - 1].score.toFixed(2) + "/15.9";
                    character.equipAction(type, highestSetValue, highestSet);
                } else {
                    var $template = tgd.armorTemplates({
                        builds: armorBuilds
                    });
                    (new tgd.dialog({
                        buttons: [{
                            label: app.activeText().movepopup_equip,
                            action: function(dialog) {
                                if ($("input.armorBuild:checked").length === 0) {
                                    BootstrapDialog.alert("Error: Please select one armor build to equip.");
                                } else {
                                    var selectedBuild = $("input.armorBuild:checked").val();
                                    highestCombo = _.findWhere(armorBuilds, {
                                        title: selectedBuild
                                    });
                                    character.equipAction(type, highestCombo.score, highestCombo.set);
                                    dialog.close();
                                }
                            }
                        }, {
                            label: app.activeText().cancel,
                            action: function(dialog) {
                                dialog.close();
                            }
                        }]
                    })).title("Multiple Armor Builds Found for Tier " + highestTier).content($template).show(true);
                    return;
                }
            } else if (type == "Light") {
                bestArmorSets = character.findHighestItemBy("Light", armor, items)[1];
                tgd.localLog("bestArmorSets: " + _.pluck(bestArmorSets, 'description'));
                bestWeaponSets = character.findHighestItemBy("Light", weapons, items)[1];
                tgd.localLog("bestWeaponSets: " + _.pluck(bestWeaponSets, 'description'));
                highestSet = bestArmorSets.concat(bestWeaponSets);
                tgd.localLog("highestSet: " + _.pluck(highestSet, 'description'));
                highestSetValue = character.calculatePowerLevelWithItems(highestSet);
                character.equipAction(type, highestSetValue, highestSet);
            } else if (type == "All") {
                bestArmorSets = character.findHighestItemBy("All", armor, items);
                tgd.localLog("bestArmorSets: " + _.pluck(bestArmorSets, 'description'));
                highestSet = bestArmorSets[1];
                highestSetValue = bestArmorSets[0];
                character.equipAction(type, highestSetValue, highestSet);
            } else {
                bestArmorSets = character.findHighestItemBy(type, armor, items);
                if (bestArmorSets[0] < tgd.DestinySkillCap) {
                    highestSetValue = bestArmorSets[0];
                    highestSet = bestArmorSets[1];
                } else {
                    bestArmorSets = character.reduceMaxSkill(type, armor, items);
                    highestSetValue = bestArmorSets[0];
                    highestSet = bestArmorSets[1];
                }
                character.equipAction(type, highestSetValue, highestSet);
            }
        };
    }
};