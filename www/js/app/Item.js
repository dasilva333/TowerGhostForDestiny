tgd.moveItemPositionHandler = function(element, item) {
    tgd.localLog("moveItemPositionHandler");
    if (app.destinyDbMode() === true) {
        tgd.localLog("destinyDbMode");
        window.open(item.href, tgd.openTabAs);
        return false;
    } else if (app.loadoutMode() === true) {
        tgd.localLog("loadoutMode");
        var existingItem, itemFound = false;
        if (item._id > 0) {
            existingItem = _.findWhere(app.activeLoadout().ids(), {
                id: item._id
            });
            if (existingItem) {
                app.activeLoadout().ids.remove(existingItem);
                itemFound = true;
            }
        } else {
            existingItem = _.filter(app.activeLoadout().generics(), function(itm) {
                return item.id == itm.hash && item.characterId() == itm.characterId;
            });
            if (existingItem.length > 0) {
                app.activeLoadout().generics.removeAll(existingItem);
                itemFound = true;
            }
        }
        if (itemFound === false) {
            if (item.transferStatus >= 2 && item.bucketType != "Subclasses") {
                $.toaster({
                    priority: 'danger',
                    title: 'Warning',
                    message: app.activeText().unable_create_loadout_for_type,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            } else if (item._id === "0") {
                app.activeLoadout().addGenericItem({
                    hash: item.id,
                    bucketType: item.bucketType,
                    characterId: item.characterId()
                });
            } else if (_.where(app.activeLoadout().items(), {
                    bucketType: item.bucketType
                }).length < 10) {
                app.activeLoadout().addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                $.toaster({
                    priority: 'danger',
                    title: 'Error',
                    message: app.activeText().unable_to_create_loadout_for_bucket + item.bucketType,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        }
    } else {
        tgd.localLog("else");
        app.activeItem(item);
        var $movePopup = $("#move-popup");
        //TODO: Investigate how to allow Gunsmith weapons to be equipped and avoid this clause
        if ((item.transferStatus >= 2 && item.bucketType != "Subclasses") || item.bucketType == "Post Master" || item.bucketType == "Messages" || item.bucketType == "Invisible" || item.bucketType == "Lost Items" || item.bucketType == "Bounties" || item.bucketType == "Mission" || item.typeName == "Armsday Order") {
            $.toaster({
                priority: 'danger',
                title: 'Error',
                message: app.activeText().unable_to_move_bucketitems,
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
            return;
        }
        if (element == tgd.activeElement) {
            $movePopup.hide();
            tgd.activeElement = null;
            tgd.localLog("hide");
        } else {
            tgd.localLog("show");
            tgd.activeElement = element;
            $ZamTooltips.hide();
            if (window.isMobile) {
                $("body").css("padding-bottom", $movePopup.height() + "px");
                /* bringing back the delay it's sitll a problem in issue #128 */
                setTimeout(function() {
                    $movePopup.show().addClass("mobile");
                }, 50);
            } else {
                tgd.localLog("display");
                $movePopup.removeClass("navbar navbar-default navbar-fixed-bottom").addClass("desktop").show().position({
                    my: "left bottom",
                    at: "left top",
                    collision: "none",
                    of: element,
                    using: function(pos, ui) {
                        var obj = $(this),
                            box = $(ui.element.element).find(".move-popup").width();
                        obj.removeAttr('style');
                        if (box + pos.left > $(window).width()) {
                            pos.left = pos.left - box;
                        }
                        obj.css(pos).width(box);
                    }
                });
            }
        }
    }
};

var Item = function(model, profile) {
    var self = this;
    //console.time("item init " + model.itemInstanceId);
    if (model && model.id) {
        model.equipRequiredLevel = 0;
        model.isEquipment = true;
    }

    this.isEquipped = ko.observable();

    /* TODO: Determine why this is needed */
    _.each(model, function(value, key) {
        if (_.isFunction(self[key])) {
            self[key](value);
        } else {
            self[key] = value;
        }
    });

    this.character = profile;
    this.futureBaseCSP = ko.observable(0);
    this.init(model);

    this.characterId = ko.observable(self.character.id);
    this.isFiltered = ko.observable(false);
    this.isVisible = ko.pureComputed(this._isVisible, this);
    this.columnMode = ko.computed(this._columnMode, this);
    this.opacity = ko.computed(this._opacity, this);
    this.primaryStatValue = ko.pureComputed(this._primaryStatValue, this);

    this.maxLightPercent = ko.pureComputed(function() {
        //console.time("maxLightPercent " + self._id);
        var maxBonusPoints = self.getValue("MaxBonusPoints");
        var futureBaseCSP = self.futureBaseCSP();
        var maxBaseCSP = tgd.DestinyMaxCSP[self.bucketType];
        if (self.id == "2672107540") {
            maxBaseCSP = 286;
        }
        if (futureBaseCSP > maxBonusPoints) {
            if (self._id == "6917529080710062428") {
                console.log("reducing maxBaseCSP by ", maxBonusPoints)
            }
            maxBaseCSP = maxBaseCSP - maxBonusPoints;
        }
        if (self._id == "6917529091018349244") {
            console.log("futureBaseCSP", futureBaseCSP, "maxBaseCSP", maxBaseCSP, self.bucketType, tgd.DestinyMaxCSP);
        }
        //convert the fraction into a whole percentage
        var maxLightPercent = (futureBaseCSP / maxBaseCSP) * 100;
        //round to 2 digits;
        //console.timeEnd("maxLightPercent " + self._id);
        return Math.round(maxLightPercent * 100) / 100;
    });
    this.cspStat = ko.pureComputed(this._cspStat, this);
    this.cspClass = ko.pureComputed(this._cspClass, this);
    //console.timeEnd("item init " + model.itemInstanceId);
};

Item.prototype = {
    init: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else if (item.id in _itemDefs) {
            item.itemHash = item.id;
            info = _itemDefs[item.id];
        } else if (item.itemHash in _questDefs) {
            info = {
                bucketTypeHash: _questDefs[item.itemHash],
                itemName: "Classified Quest",
                tierTypeName: "Common",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Quests"
            };
            console.log("found a quest item! ", item.itemHash, item, info);
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            console.log("found an item without a definition! ", item.itemHash, item);
        }
        if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
            //some weird stuff shows up under this bucketType w/o this filter
            if (info.bucketTypeHash == "2422292810" && info.deleteOnAction === false) {
                return;
            }
            var description, tierTypeName, itemDescription, itemTypeName, bucketType;
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
            info.icon = (info.icon === "") ? "/img/misc/missing_icon.png" : info.icon;
            bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
            $.extend(self, {
                id: item.itemHash,
                href: "http://destinydb.com/items/" + item.itemHash,
                _id: item.itemInstanceId,
                characterId: ko.observable(self.character.id),
                locked: ko.observable(),
                bonusStatOn: ko.observable(),
                primaryStat: ko.observable(),
                damageType: item.damageType,
                damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                isEquipment: item.isEquipment,
                isGridComplete: item.isGridComplete,
                description: description,
                itemDescription: itemDescription,
                classType: info.classType,
                bucketType: bucketType,
                type: info.itemSubType,
                typeName: itemTypeName,
                tierType: info.tierType,
                tierTypeName: tierTypeName,
                icon: tgd.dataDir + info.icon,
                maxStackSize: info.maxStackSize,
                equipRequiredLevel: item.equipRequiredLevel,
                canEquip: item.canEquip,
                weaponIndex: tgd.DestinyWeaponPieces.indexOf(bucketType),
                armorIndex: tgd.DestinyArmorPieces.indexOf(bucketType),
                transferStatus: item.transferStatus,
                backgroundPath: (itemTypeName == "Emblem") ? app.makeBackgroundUrl(info.secondaryIcon) : "",
                actualBucketType: _.reduce(tgd.DestinyLayout, function(memo, layout) {
                    if ((layout.bucketTypes.indexOf(bucketType) > -1 && layout.extras.indexOf(bucketType) == -1) || (layout.bucketTypes.indexOf(bucketType) == -1 && layout.extras.indexOf(bucketType) > -1))
                        memo = layout.array;
                    return memo;
                }, "")
            });
            self.updateItem(item);
        } else {
            console.log("item not being inserted", item, info, self.character.uniqueName());
        }
    },
    updateItem: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else if (item.itemHash in _questDefs) {
            info = {
                bucketTypeHash: _questDefs[item.itemHash],
                itemName: "Classified Quest",
                tierTypeName: "Common",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Quests"
            };
            console.log("found a quest item! ", item.itemHash, item, info);
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            console.log("found an item without a definition! ", item.itemHash, item);
        }
        var bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
        var primaryStat = self.parsePrimaryStat(item, bucketType);
        self.primaryStat(primaryStat);
        self.isEquipped(item.isEquipped);
        self.locked(item.locked);
        self.perks = self.parsePerks(item.id, item.talentGridHash, item.perks, item.nodes, item.itemInstanceId);
        self.perkTree = self.createPerkTree(item.id, item.talentGridHash, item.perks, item.nodes, item.itemInstanceId);
        self.statPerks = _.where(self.perks, {
            isStat: true
        });
        self.hasLifeExotic = _.where(self.perks, {
            name: "The Life Exotic"
        }).length > 0;
        self.stats = self.parseStats(self.perks, item.stats, item.itemHash);
        var currentBonus = (self.statPerks.length === 0) ? 0 : tgd.bonusStatPoints(self.armorIndex, primaryStat);
        var maxLightBonus = tgd.bonusStatPoints(self.armorIndex, tgd.DestinyLightCap);
        var currentCSP = tgd.sum(_.filter(_.values(self.stats), function(value) {
            return value > 0;
        }));
        self.statText = _.sortBy(_.reduce(self.stats, function(memo, stat, key) {
            if (stat > 0) {
                memo.push(key.substring(0, 3) + " " + stat);
            }
            return memo;
        }, [])).join("/");
        self.rolls = self.normalizeRolls(self.stats, self.statPerks, primaryStat, currentBonus, "");
        self.futureRolls = self.calculateFutureRolls(self.stats, self.statPerks, primaryStat, currentBonus, maxLightBonus, bucketType, this.description);
        var hasUnlockedStats = _.where(self.statPerks, {
            active: true
        }).length > 0;
        self.bonusStatOn(hasUnlockedStats ? _.findWhere(self.statPerks, {
            active: true
        }).name : "");
        self.hasUnlockedStats = hasUnlockedStats || self.statPerks.length === 0;
        self.progression = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1 && perk.isVisible === true;
        }).length === 0;

        var infusedStats = [currentCSP];
        if (primaryStat >= 200 && self.tierType >= 5 && self.armorIndex > -1) {
            var newStats = tgd.calculateInfusedStats(primaryStat, currentCSP - (self.hasUnlockedStats ? currentBonus : 0), bucketType);
            //if (primaryStat == 340) console.log("newStats", newStats, self.description);
            infusedStats = _.uniq(_.map(newStats, function(stat) {
                return Math.min(stat + maxLightBonus, tgd.DestinyMaxCSP[self.bucketType]);
            }));
            self.futureBaseCSP(newStats[1]);
        }
        self.primaryValues = {
            CSP: currentCSP,
            Default: primaryStat,
            MaxLightCSP: infusedStats[0],
            currentBonus: currentBonus,
            maxLightBonus: maxLightBonus,
            predictedCSP: infusedStats
        };
    },
    calculateFutureRolls: function(stats, statPerks, primaryStat, currentBonus, futureBonus, bucketType, description) {
        var futureRolls = [];
        if (statPerks.length === 0) {
            futureRolls = [stats];
        } else {
            var allStatsLocked = _.where(statPerks, {
                active: true
            }).length === 0;
            futureRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                var isStatActive = statPerk.active;
                //Figure out the stat name of the other node
                var otherStatName = _.reduce(stats, function(memo, stat, name) {
                    return (name != statPerk.name && stat > 0) ? name : memo;
                }, '');
                //Normalize stats by removing the bonus stat from the active node
                var activeStatName = isStatActive ? statPerk.name : otherStatName;
                if (activeStatName !== "") {
                    tmp[activeStatName] = tmp[activeStatName] - (allStatsLocked ? 0 : currentBonus);
                }
                var currentStatValue = tmp[statPerk.name],
                    otherStatValue = tmp[otherStatName];
                //Calculate both stats at Max Light with bonus
                tmp[statPerk.name] = (primaryStat >= tgd.DestinyStatCap ? currentStatValue : tgd.calculateInfusedStats(primaryStat, currentStatValue, bucketType)[0]) + futureBonus;
                tmp["bonusOn"] = statPerk.name;
                if (otherStatName !== "") {
                    tmp[otherStatName] = (primaryStat >= tgd.DestinyStatCap ? otherStatValue : tgd.calculateInfusedStats(primaryStat, otherStatValue, bucketType)[0]);
                }
                if (description == "Graviton Forfeit") {
                    console.log(description, stats, statPerks, statPerk.name, otherStatName, activeStatName, isStatActive, primaryStat, currentStatValue, tmp[statPerk.name], tmp);
                    //abort;
                }
                return tmp;
            });
            /**/
        }
        return futureRolls;
    },
    normalizeRolls: function(stats, statPerks, primaryStat, bonus, description) {
        var arrRolls = [];
        if (statPerks.length === 0) {
            arrRolls = [stats];
        } else {
            var hasUnlockedStats = _.where(statPerks, {
                active: true
            }).length > 0;

            arrRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                tmp["bonusOn"] = statPerk.name;
                if (hasUnlockedStats && statPerk.active === false) {
                    var otherStatName = _.reduce(stats, function(memo, stat, name) {
                        return (name != statPerk.name && stat > 0) ? name : memo;
                    }, '');
                    tmp[otherStatName] = tmp[otherStatName] - bonus;
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                } else if (hasUnlockedStats === false) {
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                }
                return tmp;
            });
            /*if ( description == "Jasper Carcanet" ){
            	console.log(description, stats, statPerks, primaryStat, bonus, arrRolls);
            }*/
        }
        return arrRolls;
    },
    parsePrimaryStat: function(item, bucketType) {
        var primaryStat = "";
        if (item.primaryStat) {
            if (item.primaryStat && item.primaryStat.value) {
                primaryStat = item.primaryStat.value;
            } else {
                primaryStat = item.primaryStat;
            }
        }
        if (item && item.objectives && item.objectives.length > 0) {
            var progress = (tgd.average(_.map(item.objectives, function(objective) {
                var result = 0;
                if (objective.objectiveHash in _objectiveDefs && _objectiveDefs[objective.objectiveHash] && _objectiveDefs[objective.objectiveHash].completionValue) {
                    result = objective.progress / _objectiveDefs[objective.objectiveHash].completionValue;
                }
                return result;
            })) * 100).toFixed(0) + "%";
            primaryStat = (primaryStat === "") ? progress : primaryStat + "/" + progress;
        }
        if (_.has(tgd.DestinyBucketSizes, bucketType)) {
            primaryStat = item.stackSize;
        }
        return primaryStat;
    },
    parseStats: function(perks, stats, itemHash) {
        var parsedStats = {};
        if (stats && stats.length && stats.length > 0) {
            _.each(stats, function(stat) {
                if (stat.statHash in window._statDefs) {
                    var p = window._statDefs[stat.statHash];
                    parsedStats[p.statName] = stat.value;
                }
            });
            //Truth has a bug where it displays a Mag size of 2 when it's actually 3, all other RL don't properly reflect the mag size of 3 when Tripod is enabled
            if (_.findWhere(perks, {
                    name: "Tripod",
                    active: true
                }) || [1274330686, 2808364178].indexOf(itemHash) > -1) {
                parsedStats.Magazine = 3;
            }
        }
        //this is for the static share site
        else if (_.isObject(stats)) {
            parsedStats = stats;
        }
        return parsedStats;
    },
    createPerkTree: function(id, talentGridHash, perks, nodes, itemInstanceId) {
        var self = this;
        var talentGrid = _talentGridDefs[talentGridHash];
        self.dtrUrl = [];
        var perkTree = _.reduce(nodes, function(memo, node) {
            var tgNode = _.findWhere(talentGrid.nodes, {
                nodeHash: node.nodeHash
            });
            var level = tgNode.column;
            var dtrHash = node.nodeHash.toString(16);
            var stepIndex = node.stepIndex.toString(16);
            if (dtrHash.length > 1) dtrHash += ".";
            dtrHash += stepIndex;
            if (node.isActivated) dtrHash += "o";
            self.dtrUrl.push(dtrHash);
            var talent = tgNode.steps[node.stepIndex];
            if (talent && !node.hidden) {
                talent.node = node;
                talent.column = level;
                if (!_.has(memo, level)) {
                    memo[level] = [];
                }
                if (_.pluck(memo[level], 'nodeStepHash').indexOf(talent.nodeStepHash) == -1) {
                    memo[level].push(talent);
                }
            }
            return memo;
        }, []);
        self.ddbUrl = _.reduce(perkTree, function(memo, p, i) {
            if (i > 0) {
                _.each(p, function(n, ii) {
                    if (n.node.isActivated) {
                        memo.push([n.column, ii, n.node.stepIndex + 1].join("-"));
                    }
                });
            }
            return memo;
        }, []).join(";");
        if (self.href.indexOf("#calc") == -1) {
            self.href = self.href + "#calc;" + self.ddbUrl;
        }
        self.dtrUrl = self.dtrUrl.join(";");
        return perkTree;
    },
    parsePerks: function(id, talentGridHash, perks, nodes, itemInstanceId) {
        var parsedPerks = [];
        if (id) {
            parsedPerks = perks;
        } else if (_.isArray(perks) && perks.length > 0) {
            var talentGrid = _talentGridDefs[talentGridHash];
            if (talentGrid && talentGrid.nodes) {
                _.each(perks, function(perk) {
                    if (perk.perkHash in window._perkDefs) {
                        var isInherent, p = window._perkDefs[perk.perkHash];
                        //There is an inconsistency between perkNames in Destiny for example:
                        /* Boolean Gemini - Has two perks David/Goliath which is also called One Way/Or Another
                           This type of inconsistency leads to issues with filtering therefore p.perkHash must be used
                        */
                        var nodeIndex = talentGrid.nodes.indexOf(
                            _.filter(talentGrid.nodes, function(o) {
                                return _.flatten(_.pluck(o.steps, 'perkHashes')).indexOf(p.perkHash) > -1;
                            })[0]
                        );
                        if (nodeIndex > 0) {
                            isInherent = _.reduce(talentGrid.nodes[nodeIndex].steps, function(memo, step) {
                                if (memo === false) {
                                    var isPerk = _.values(step.perkHashes).indexOf(p.perkHash) > -1;
                                    if (isPerk && step.activationRequirement.gridLevel === 0) {
                                        memo = true;
                                    }
                                }
                                return memo;
                            }, false);
                        }
                        var description = p && p.displayDescription ? p.displayDescription : "";
                        parsedPerks.push({
                            iconPath: tgd.dataDir + p.displayIcon,
                            name: p.displayName,
                            description: '<strong>' + p.displayName + '</strong>: ' + description,
                            active: perk.isActive,
                            isExclusive: talentGrid.exclusiveSets.indexOf(nodeIndex),
                            isInherent: isInherent,
                            isVisible: true,
                            hash: p.perkHash
                        });
                    }
                });
                var statNames = _.pluck(tgd.DestinyArmorStats, 'statName'),
                    perkHashes = _.pluck(parsedPerks, 'hash'),
                    perkNames = _.pluck(parsedPerks, 'name'),
                    talentPerks = {};
                var talentGridNodes = talentGrid.nodes;
                _.each(nodes, function(node) {
                    if (node.hidden === false) {
                        var nodes = _.findWhere(talentGridNodes, {
                            nodeHash: node.nodeHash
                        });
                        if (nodes && nodes.steps && _.isArray(nodes.steps)) {
                            var perk = nodes.steps[node.stepIndex];
                            var isSkill = _.intersection(perk.nodeStepName.split(" "), statNames);
                            if (isSkill.length === 0 &&
                                (tgd.DestinyUnwantedNodes.indexOf(perk.nodeStepName) == -1) &&
                                (perkNames.indexOf(perk.nodeStepName) == -1) &&
                                (perk.perkHashes.length === 0 || perkHashes.indexOf(perk.perkHashes[0]) === -1)) {
                                talentPerks[perk.nodeStepName] = {
                                    active: node.isActivated,
                                    name: perk.nodeStepName,
                                    description: '<strong>' + perk.nodeStepName + '</strong>: ' + perk.nodeStepDescription,
                                    iconPath: tgd.dataDir + perk.icon,
                                    isExclusive: -1,
                                    hash: perk.icon.match(/icons\/(.*)\.png/)[1],
                                    isVisible: node.isActivated
                                };
                            } else if (isSkill.length > 0) {
                                var statName = isSkill[0];
                                talentPerks[statName] = {
                                    active: node.isActivated === true && [7, 1].indexOf(node.state) == -1,
                                    name: statName,
                                    description: "",
                                    iconPath: "",
                                    isExclusive: -1,
                                    isVisible: false,
                                    isStat: true,
                                    hash: _.findWhere(tgd.DestinyArmorStats, {
                                        statName: statName
                                    })
                                };
                            }
                        }
                    }
                });
                _.each(talentPerks, function(perk) {
                    parsedPerks.push(perk);
                });
            }
        }
        return parsedPerks;
    },
    _opacity: function() {
        return (this.equipRequiredLevel <= this.character.level() || this.character.id == 'Vault') ? 1 : 0.3;
    },
    _columnMode: function() {
        var self = this;
        var className = "";
        if (self.characterId() == 'Vault') {
            className = 'col-xs-' + app.vaultColumns();
        } else if (tgd.DestinyBucketColumns[self.bucketType] == 4) {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 4);
        } else {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 3);
        }
        if (self.isGridComplete) {
            className += ' complete';
        }
        return className;
    },
    isEquippable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            //rules for how subclasses can be equipped
            var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
            //if it's in this character and it's equippable
            return (self.characterId() == avatarId && !self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.bucketType != 'Ornaments' && self.description.indexOf("Engram") == -1 && self.typeName.indexOf("Armsday") == -1 && equippableSubclass) || (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass && self.transferStatus < 2);
        });
    },
    isStoreable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            return (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses' && self.transferStatus < 2) ||
                (self.isEquipped() && self.character.id == avatarId);
        });
    },
    clone: function() {
        var self = this;
        var model = {};
        for (var i in self) {
            if (self.hasOwnProperty(i)) {
                var val = ko.unwrap(self[i]);
                if (typeof(val) !== 'function') {
                    model[i] = val;
                }
            }
        }
        //tgd.localLog("model: ");
        //tgd.localLog(model);
        var newItem = new Item(model, self.character);
        return newItem;
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
            /* Missing Perks */
            if (state == "1" && self.progression === false) {
                return true;
            }
            /* Filled perks but not maxed out */
            else if (state == "2" && self.progression === true && self.isGridComplete === false) {
                return true;
            }
            /* Maxed weapons (Gold Borders only) */
            else if (state == "3" && self.progression === true && self.isGridComplete === true) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    hasGeneral: function(type) {
        if (type == "Engrams" && this.description.indexOf("Engram") > -1 && this.isEquipment === false) {
            return true;
            //TODO: Investigate if the Chroma Vow ships fall under isEquipment=false
        } else if (type == "Chroma Colors" && this.description.indexOf("Chroma") > -1 && this.isEquipment === false) {
            return true;
        } else if (type in tgd.DestinyGeneralItems && tgd.DestinyGeneralItems[type].indexOf(this.id) > -1) {
            return true;
        } else {
            return false;
        }
    },
    _cspStat: function() {
        var stat = this.primaryStat();
        if (app.armorViewBy() == 'CSP' && _.has(tgd.DestinyMaxCSP, this.bucketType)) {
            stat = this.getValue("All") + "-" + this.getValue("MaxLightCSP");
        }
        return stat;
    },
    _cspClass: function() {
        var rollType = "None";
        if (_.has(tgd.DestinyMaxCSP, this.bucketType)) {
            var maxLightPercent = ko.unwrap(this.maxLightPercent),
                minAvgPercentNeeded = ko.unwrap(app.minAvgPercentNeeded);
            rollType = "BadRoll";
            if (maxLightPercent >= minAvgPercentNeeded) {
                rollType = "GoodRoll";
            }
            //4 pts under the requirement is still good enough to maybe get you there
            else if (maxLightPercent >= (minAvgPercentNeeded - 4)) {
                rollType = "OkayRoll";
            }
        }
        if (this.weaponIndex > -1) {
            rollType = this.damageTypeName;
        }
        return rollType;
    },
    _primaryStatValue: function() {
        if (this.primaryStat && typeof this.primaryStat == "function") {
            var primaryStat = ko.unwrap(this.primaryStat());
            if (this.objectives && typeof primaryStat == "string" && primaryStat.indexOf("/") > -1) {
                primaryStat = parseInt(primaryStat.split("/")[0]);
            }
            return primaryStat;
        }
    },
    _isVisible: function() {
        var $parent = app,
            self = this;

        if (typeof self.id == "undefined") {
            return false;
        }

        var dmgFilter = true;
        var progressFilter = true;
        var weaponFilter = true;
        var armorFilter = true;
        var showDuplicate = true;
        var setFilter = true;
        var searchFilter = ($parent.searchKeyword() === '' || $parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) > -1);
        var tierFilter = $parent.tierFilter() == "0" || $parent.tierFilter() == self.tierType;
        var lockFilter = $parent.lockedState() == "" || (($parent.lockedState() == "locked" && self.locked()) || ($parent.lockedState() == "unlocked" && !self.locked()))

        var itemStatValue = "";
        if (this.primaryStatValue && this.primaryStatValue()) {
            itemStatValue = this.primaryStatValue().toString();
        }
        var operator = $parent.searchKeyword().substring(0, 1);
        if (itemStatValue !== "" && itemStatValue.indexOf("%") == -1 && (operator == ">" || operator == "<" || $.isNumeric($parent.searchKeyword()))) {
            var operand = "=",
                searchValue = $parent.searchKeyword();
            if (operator === ">" || operator === "<") {
                operand = operator + operand;
                searchValue = searchValue.replace(operator, '');
            } else {
                operand = "=" + operand;
            }
            searchFilter = new Function('return ' + itemStatValue + operand + searchValue.toString())();
        }

        if (self.armorIndex > -1 || self.weaponIndex > -1) {
            setFilter = $parent.setFilter().length === 0 || $parent.setFilter().indexOf(self.id) > -1;
            searchFilter = searchFilter || self.hasPerkSearch($parent.searchKeyword());
            if (self.weaponIndex > -1) {
                dmgFilter = $parent.dmgFilter().length === 0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
                weaponFilter = $parent.weaponFilter() == "0" || $parent.weaponFilter() == self.typeName;
            } else {
                var types = _.map(_.pluck(self.perks, 'name'), function(name) {
                    return name && name.split(" ")[0];
                });
                dmgFilter = $parent.dmgFilter().length === 0 || _.intersection($parent.dmgFilter(), types).length > 0;
                armorFilter = $parent.armorFilter() == "0" || $parent.armorFilter() == self.bucketType;
            }
            progressFilter = $parent.progressFilter() == "0" || self.hashProgress($parent.progressFilter());
        }
        generalFilter = $parent.generalFilter() == "0" || self.hasGeneral($parent.generalFilter());
        showDuplicate = $parent.customFilter() === false || ($parent.customFilter() === true && self.isFiltered() === true);

        var isVisible = (lockFilter) && (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (weaponFilter) && (armorFilter) && (generalFilter) && (showDuplicate);
        //console.timeEnd("isVisible");
        /*if ( self.description == "Red Death") {
			tgd.localLog( "searchFilter: " + searchFilter);
			tgd.localLog( "dmgFilter: " + dmgFilter);
			tgd.localLog( "setFilter: " + setFilter);
			tgd.localLog( "tierFilter: " + tierFilter);
			tgd.localLog( "progressFilter: " + progressFilter);
			tgd.localLog( "weaponFilter: " + weaponFilter);
			tgd.localLog( "armorFilter: " + armorFilter);
			tgd.localLog( "generalFilter: " + generalFilter);
			tgd.localLog( "showDuplicate: " + showDuplicate);
		}*/
        return isVisible;
    },
    /* helper function that unequips the current item in favor of anything else */
    unequip: function(callback) {
        var self = this;
        tgd.localLog('trying to unequip too!');
        if (self.isEquipped() === true) {
            tgd.localLog("and its actually equipped");
            var otherEquipped = false,
                itemIndex = -1,
                otherItems = _.sortBy(_.filter(self.character.items(), function(item) {
                    return (item._id != self._id && item.bucketType == self.bucketType && item.isEquippable(self.character.id)());
                }), function(item) {
                    return (item.getValue("Light") + item.getValue("CSP")) * -1;
                });
            if (otherItems.length > 0) {
                /* if the only remainings item are exotic ensure the other buckets dont have an exotic equipped */
                var minTier = _.min(_.pluck(otherItems, 'tierType'));
                var tryNextItem = function() {
                    var item = otherItems[++itemIndex];
                    if (_.isUndefined(item)) {
                        if (callback) callback(false);
                        else {
                            tgd.localLog("transfer error 5");
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: app.activeText().cannot_unequip + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                        return;
                    }
                    /* still haven't found a match */
                    if (otherEquipped === false) {
                        if (item != self && item.equip) {
                            tgd.localLog(itemIndex, "trying to equip " + item.description);
                            item.equip(self.characterId(), function(isEquipped, result) {
                                console.log(item.description + " result was " + isEquipped);
                                if (isEquipped === true) {
                                    otherEquipped = true;
                                    callback(true);
                                } else if (isEquipped === false && result && result.ErrorCode && result.ErrorCode === 1634) {
                                    callback(false);
                                } else {
                                    tryNextItem();
                                    tgd.localLog("tryNextItem()");
                                }
                            });
                        } else {
                            tryNextItem();
                            tgd.localLog("tryNextItem()");
                        }
                    }
                };
                tgd.localLog("tryNextItem");
                tgd.localLog("trying to unequip item, the min tier of the items I can equip is: " + minTier);
                if (minTier == 6) {
                    var otherItemUnequipped = false;
                    var otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                    otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                    _.each(otherBucketTypes, function(bucketType) {
                        var itemEquipped = self.character.itemEquipped(bucketType);
                        if (itemEquipped && itemEquipped.tierType && itemEquipped.tierType == 6) {
                            tgd.localLog("going to unequip " + itemEquipped.description);
                            itemEquipped.unequip(function(result) {
                                //unequip was successful
                                if (result) {
                                    tryNextItem();
                                }
                                //unequip failed
                                else {
                                    tgd.localLog("transfer error 6");
                                    $.toaster({
                                        priority: 'danger',
                                        title: 'Error',
                                        message: app.activeText().unable_unequip + itemEquipped.description,
                                        settings: {
                                            timeout: tgd.defaults.toastTimeout
                                        }
                                    });
                                    callback(false);
                                }
                            });
                            otherItemUnequipped = true;
                        }
                    });
                    if (!otherItemUnequipped) {
                        tgd.localLog("no other exotic equipped, safe to equip");
                        tryNextItem();
                    }
                } else {
                    tryNextItem();
                }
            } else {
                tgd.localLog("refused to unequip");
                callback(false);
            }
        } else {
            tgd.localLog("but not equipped");
            callback(true);
        }
    },
    equip: function(targetCharacterId, callback) {
        var self = this;
        var done = function() {
            tgd.localLog("making bungie call to equip " + self.description);
            app.bungie.equip(targetCharacterId, self._id, function(e, result) {
                if (result && result.Message && result.Message == "Ok") {
                    var done = function() {
                        tgd.localLog(self);
                        tgd.localLog("result was OKed for " + self.description);
                        tgd.localLog(result);
                        self.isEquipped(true);
                        self.character.items().forEach(function(item) {
                            if (item._id != self._id && item.bucketType == self.bucketType && item.isEquipped() === true) {
                                item.isEquipped(false);
                            }
                        });
                        if (self.bucketType == "Emblem") {
                            self.character.icon(self.icon);
                            self.character.background(self.backgroundPath);
                        }
                        if (callback) callback(true);
                    };
                    if (!(self instanceof Item)) {
                        app.findReference(self, function(item) {
                            self = item;
                            done();
                        });
                        tgd.localLog("changing reference of self to actual item");
                    } else {
                        done();
                    }
                } else {
                    tgd.localLog("transfer error 7 " + result);
                    /* this is by design if the user equips something they couldn't the app shouldn't assume a replacement unless it's via loadouts */
                    if (callback) callback(false, result);
                    else if (result && result.Message) {
                        $.toaster({
                            priority: 'info',
                            title: 'Error',
                            message: result.Message,
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                    //TODO perhaps log this condition and determine the cause
                    else {
                        BootstrapDialog.alert(self.description + ":" + app.activeText().cannot_equip + (result && result.error) ? result.error : "");
                    }
                }
            });
        };
        var sourceCharacterId = self.characterId();
        tgd.localLog("equip called from " + sourceCharacterId + " to " + targetCharacterId);
        if (targetCharacterId == sourceCharacterId) {
            tgd.localLog("item is already in the character");
            /* if item is exotic */
            if (self.tierType == 6 && self.hasLifeExotic === false) {
                //tgd.localLog("item is exotic");
                var otherExoticFound = false,
                    otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                //tgd.localLog("the other bucket types are " + JSON.stringify(otherBucketTypes));
                _.each(otherBucketTypes, function(bucketType) {
                    var otherExotic = _.filter(_.where(self.character.items(), {
                        bucketType: bucketType,
                        tierType: 6
                    }), function(item) {
                        return item.isEquipped() && item.hasLifeExotic === false;
                    });
                    //tgd.localLog( "otherExotic: " + JSON.stringify(_.pluck(otherExotic,'description')) );
                    if (otherExotic.length > 0) {
                        //tgd.localLog("found another exotic equipped " + otherExotic[0].description);
                        otherExoticFound = true;
                        otherExotic[0].unequip(done);
                    }
                });
                if (otherExoticFound === false) {
                    done();
                }
            } else {
                //tgd.localLog("request is not part of a loadout");
                done();
            }
        } else {
            tgd.localLog("item is NOT already in the character");
            self.store(targetCharacterId, function(newProfile) {
                tgd.localLog("item is now in the target destination");
                self.character = newProfile;
                self.characterId(newProfile.id);
                self.equip(targetCharacterId, callback);
            });
        }
    },
    getStackAmount: function(stacks) {
        return _.reduce(stacks, function(memo, item) {
            memo = memo + item.primaryStat();
            return memo;
        }, 0);
    },
    adjustGenericItem: function(sourceCharacter, targetCharacter, amount, callback) {
        var self = this;
        var maxStackSize = this.maxStackSize;
        /* find the like items in the source and target characters */
        var sourceStacks = sourceCharacter.getSiblingStacks(self.description);
        var targetStacks = targetCharacter.getSiblingStacks(self.description);
        /* calculate the remainder in the source character */
        var sourceRemainder = Math.max(0, self.getStackAmount(sourceStacks) - amount);
        console.log("remainder in source: " + sourceRemainder);
        /* calculate the remainder in the target character */
        var targetItem = _.findWhere(targetCharacter.items(), {
            description: this.description
        });
        var amountInTarget = self.getStackAmount(targetStacks);
        var targetAmount = amount + amountInTarget;
        var remainder = 0;
        console.log("remainder in target: " + targetAmount);
        console.log("sourceStacks", sourceStacks.length, targetStacks.length);
        /* adjust the source character stack */
        if (sourceRemainder === 0) {
            console.log("sourceRemainder is zero removing all stacks", sourceStacks);
            _.each(sourceStacks, function(item) {
                sourceCharacter.items.remove(item);
            });
        } else if (sourceRemainder <= maxStackSize) {
            console.log("sourceRemainder lt maxStackSize", sourceRemainder);
            self.primaryStat(sourceRemainder);
            if (sourceStacks.length > 1) {
                _.each(sourceStacks, function(item, index) {
                    if (item != self) self.character.items.remove(item);
                });
            }
        } else {
            var totalItemsAmount = Math.ceil(sourceRemainder / maxStackSize);
            remainder = sourceRemainder;
            console.log("sourceRemainder gt maxStackSize ", sourceRemainder);
            _.each(sourceStacks, function(item) {
                var itemAmount = remainder - maxStackSize > 0 ? maxStackSize : remainder;
                if (itemAmount > 0) {
                    console.log("updating item to ", itemAmount);
                    item.primaryStat(itemAmount);
                    remainder = remainder - itemAmount;
                } else {
                    console.log("removing item");
                    self.character.items.remove(item);
                }
            });
            console.log("missingItemsAmountFromSource", sourceRemainder, totalItemsAmount, sourceStacks.length);
        }
        /* adjust the target character stack */
        if (targetAmount <= maxStackSize) {
            if (targetItem) {
                targetItem.primaryStat(targetAmount);
            } else {
                var theClone = self.clone();
                theClone.characterId(targetCharacter.id);
                theClone.character = targetCharacter;
                theClone.primaryStat(targetAmount);
                targetCharacter.items.push(theClone);
            }
        } else {
            var totalTargetStacks = Math.ceil(targetAmount / maxStackSize),
                missingItemsAmount = totalTargetStacks - targetStacks.length;
            remainder = amountInTarget === 0 ? targetAmount : targetAmount - ((totalTargetStacks - 1) * maxStackSize);
            console.log("missingItemsAmount", totalTargetStacks, missingItemsAmount, targetAmount, remainder);
            _.each(targetStacks, function(item) {
                if (item.primaryStat() < maxStackSize) {
                    console.log("updating item to maxStackSize: ", maxStackSize);
                    item.primaryStat(maxStackSize);
                }
            });
            _.times(missingItemsAmount, function(index) {
                var itemAmount = remainder - maxStackSize > 0 ? maxStackSize : remainder;
                console.log("new itemAmount", itemAmount);
                remainder = remainder - itemAmount;
                var theClone = self.clone();
                theClone.characterId(targetCharacter.id);
                theClone.character = targetCharacter;
                theClone.primaryStat(itemAmount);
                targetCharacter.items.push(theClone);
            });
            console.log("missingItemsAmountFromTarget", missingItemsAmount, targetStacks.length);
        }
        callback();
        /*tgd.localLog("[from: " + sourceCharacterId + "] [to: " + targetCharacterId + "] [amount: " + amount + "]");
        var existingItem = _.find(
        	_.where(y.items(), {
        		description: self.description
        	}),
        	function(i) {
        		return i.primaryStat() < i.maxStackSize;
        	});

        var theClone;
        var remainder = self.primaryStat() - amount;
        var isOverflow = (typeof existingItem == "undefined") ? false : ((existingItem.primaryStat() + amount) > existingItem.maxStackSize);
        tgd.localLog("[remainder: " + remainder + "] [overflow: " + isOverflow + "] [underflow: " + (remainder < 0) + "]");

        var tmpAmount = 0;
        if (existingItem !== undefined) {
        	tgd.localLog("existing stack in destination");
        	tmpAmount = Math.min(existingItem.maxStackSize - existingItem.primaryStat(), amount);
        	tgd.localLog("tmpAmount: " + tmpAmount);
        	if (isOverflow) {
        		tgd.localLog("overflow: " + (amount - tmpAmount));
        		// existing stack gets maxed
        		existingItem.primaryStat(existingItem.maxStackSize);
        		tgd.localLog("existingItem.primaryStat updated to " + existingItem.maxStackSize);
        	} else {
        		tgd.localLog("no overflow");
        	}
        } else {
        	tgd.localLog("no existing stack in destination or existing stacks are full");
        }

        // grab self index in x.items
        //var idxSelf = x.items.indexOf(self);
        var idxSelf = _.indexOf(x.items(), _.findWhere(x.items(), {
        	id: self.id
        }));
        console.log("x", x, x.uniqueName(), x.items(), self, self.description, self.primaryStat());
        // remove self from x.items
        //THIS IS WHERE IT"S FUNAMENTALLY FLAWED
        x.items.remove(self);
        tgd.localLog("removed self from x.items @ index " + idxSelf);
        // if remainder, clone self and add clone to x.items in same place that self was with remainder as primaryStat
        if (remainder > 0) {
        	tgd.localLog("[remainder: " + remainder + "] [clone on source: " + remainder + "]");
        	theClone = self.clone();
        	theClone.characterId(sourceCharacterId);
        	theClone.character = x;
        	theClone.primaryStat(remainder);
        	x.items.splice(idxSelf, 0, theClone);
        	tgd.localLog("inserted clone to x.items @ " + idxSelf + " with primaryStat " + remainder);
        } else if (remainder < 0) {
        	tgd.localLog("[remainder: " + remainder + "] [no clone] [underflow]");
        	var sourceRemaining = (amount - self.primaryStat());
        	tgd.localLog("need to remove " + sourceRemaining + " more from " + sourceCharacterId);
        	var sourceExistingItems = _.where(x.items(), {
        		description: self.description
        	});
        	// handle weird cases when user has transferred more than a stacks worth. Bungie API allows this.
        	var sourceIdx = sourceExistingItems.length - 1;
        	while ((sourceRemaining > 0) && (sourceIdx >= 0)) {
        		var sourceRightMost = sourceExistingItems[sourceIdx];
        		var sourceTmpAmount = Math.min(sourceRemaining, sourceRightMost.primaryStat());
        		tgd.localLog("removing " + sourceTmpAmount + " from right most");
        		sourceRightMost.primaryStat(sourceRightMost.primaryStat() - sourceTmpAmount);
        		if (sourceRightMost.primaryStat() <= 0) {
        			x.items.remove(sourceRightMost);
        			tgd.localLog("right most dropped to 0 or less, removing");
        		}
        		sourceRemaining = sourceRemaining - sourceTmpAmount;
        		tgd.localLog("still need to remove " + sourceRemaining + " from " + sourceCharacterId);
        		sourceIdx = sourceIdx - 1;
        	}
        } else {
        	tgd.localLog("no remainder, no clone");
        }
        var idxExistingItem;
        var newAmount;
        if (existingItem !== undefined) {
        	if (!isOverflow) {
        		// grab existingItem index in y.items
        		idxExisting = y.items.indexOf(existingItem);
        		// remove existingItem from y.items
        		y.items.remove(existingItem);
        		tgd.localLog("removed existingItem from y.items @ index " + idxExisting);
        		// self becomes the swallowing stack @ y.items indexOf existingItem with (amount + existingItem.primaryStat())
        		newAmount = amount + existingItem.primaryStat();
        	} else {
        		newAmount = amount - tmpAmount;
        		tgd.localLog("self gets added to y.items as a new stack with (amount - tmpAmount) " + newAmount);
        	}
        } else {
        	newAmount = amount;
        	tgd.localLog("self gets added to y.items as a new stack with (amount) " + newAmount);
        }
        self.characterId(targetCharacterId);
        self.character = y;
        self.primaryStat(newAmount);
        if (existingItem !== undefined) {
        	if (!isOverflow) {
        		y.items.splice(idxExisting, 0, self);
        		tgd.localLog("adding self to y.items @ index " + idxExisting + " with amount: " + self.primaryStat());
        	} else {
        		y.items.push(self);
        		tgd.localLog("adding self to y.items @ tail with amount: " + self.primaryStat());
        	}
        } else {
        	y.items.push(self);
        	tgd.localLog("adding self to y.items @ tail with amount: " + self.primaryStat());
        }
        console.log("1042: newAmount: " + newAmount, newAmount > self.maxStackSize, self.maxStackSize);
        // visually split stuff if stacks transferred eceeded maxStackSize for that item
        if (newAmount > self.maxStackSize) {
        	tgd.localLog("exceeded maxStackSize, need to do some visual splitting");
        	while (self.primaryStat() > self.maxStackSize) {
        		var extraAmount = self.primaryStat() - self.maxStackSize;
        		idxSelf = y.items.indexOf(self);
        		// put clone at self index keeping self to the 'right'
        		theClone = self.clone();
        		theClone.characterId(targetCharacterId);
        		theClone.character = y;
        		theClone.primaryStat(self.maxStackSize);
        		y.items.splice(idxSelf, 0, theClone);
        		tgd.localLog("inserted clone to y.items @ " + idxSelf + " with primaryStat " + theClone.primaryStat());
        		// adjust self value
        		self.primaryStat(extraAmount);
        	}
        }

        // clean up. if we've split a stack and have other stacks 'to the right' we need to join them shuffling values 'left'.
        if (remainder !== 0) {
        	tgd.localLog("running cleanup code...");
        	var selfExistingItems = _.where(x.items(), {
        		description: self.description
        	});
        	var idx = 0;
        	while (idx < selfExistingItems.length) {
        		if ((idx + 1) >= selfExistingItems.length) {
        			tgd.localLog("nothing to cleanup");
        			break;
        		}

        		var cur = selfExistingItems[idx];
        		if (cur.primaryStat() < cur.maxStackSize) {
        			var next = selfExistingItems[idx + 1];
        			var howMuch = Math.min(cur.maxStackSize - cur.primaryStat(), next.primaryStat());
        			tgd.localLog("shifting left...");

        			cur.primaryStat(cur.primaryStat() + howMuch);
        			next.primaryStat(next.primaryStat() - howMuch);
        			if (next.primaryStat() <= 0) {
        				tgd.localLog("drained a stack in cleanup");
        				x.items.remove(next);
        			}
        		}

        		idx = idx + 1;
        	}
        }
        tgd.localLog("---------------------");*/
    },
    transfer: function(sourceCharacterId, targetCharacterId, amount, cb) {
        //tgd.localLog("Item.transfer");
        //tgd.localLog(arguments);
        var self = this,
            x, y, characters = app.characters();
        if (characters.length === 0) {
            /*ga('send', 'exception', {
                'exDescription': "No characters found to transfer with " + JSON.stringify(app.activeUser()),
                'exFatal': false,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    tgd.localLog("crash reported");
                }
            });*/
            app.refresh();
            return BootstrapDialog.alert("Attempted a transfer with no characters loaded, how is that possible? Please report this issue to my Github.");
        }

        var isVault = (targetCharacterId == "Vault");
        var ids = _.pluck(characters, 'id');
        x = characters[ids.indexOf(sourceCharacterId)];
        y = characters[ids.indexOf(targetCharacterId)];
        if (_.isUndefined(y)) {
            return app.refresh();
        }
        //This is a stop-gap measure because materials/consumables don't have the replacement tech built-in
        var itemsInDestination = _.where(y.items(), {
            bucketType: self.bucketType
        }).length;
        var maxBucketSize = self.bucketType in tgd.DestinyBucketSizes ? tgd.DestinyBucketSizes[self.bucketType] : 10;
        if (itemsInDestination == maxBucketSize && y.id != "Vault") {
            return BootstrapDialog.alert("Cannot transfer " + self.description + " because " + self.bucketType + " is full.");
        }
        //tgd.localLog( self.description );
        app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result) {
            //tgd.localLog("app.bungie.transfer after");
            //tgd.localLog(arguments);			
            if (result && result.Message && result.Message == "Ok") {
                if (self.bucketType == "Materials" || self.bucketType == "Consumables" || self.bucketType == "Ornaments") {
                    self.adjustGenericItem(x, y, amount, function() {
                        cb(y, x);
                    });
                } else {
                    tgd.localLog("removing " + self.description + " from " + x.uniqueName() + " currently at " + x.items().length);
                    /* remove the item where it came from after transferred by finding it's unique instance id */
                    x.items.remove(function(item) {
                        return item._id == self._id;
                    });
                    tgd.localLog("after removal " + x.items().length);
                    /* update the references as to who this item belongs to */
                    self.character = y;
                    /* move this item to the target destination */
                    tgd.localLog("adding " + self.description + " to " + y.uniqueName());
                    y.items.push(self);
                    /* TODO: Fix the delayed characterId update */
                    setTimeout(function() {
                        self.characterId(targetCharacterId);
                        //not sure why this is nessecary but w/o it the xfers have a delay that cause free slot errors to show up
                        if (cb) cb(y, x);
                    }, 500);
                }
            } else if (cb) {
                tgd.localLog(self.description + "  error during transfer!!!");
                tgd.localLog(result);
                cb(y, x, result);
            } else if (result && result.Message) {
                tgd.localLog("transfer error 1");
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        });
    },
    handleTransfer: function(targetCharacterId, cb) {
        var self = this;
        return function(y, x, result) {
            if (result && result.ErrorCode && (result.ErrorCode == 1656 || result.ErrorCode == 1623)) {
                tgd.localLog("reloading bucket " + self.bucketType);
                /*var characterId = app.characters()[1].id;
				var instanceId = app.characters()[1].weapons()[0]._id;*/
                /*app.bungie.getAccountSummary(function(results) {
                    var characterIndex = _.findWhere(results.data.items, {
                        itemId: self._id
                    }).characterIndex;
                    if (characterIndex > -1) {
                        characterId = results.data.characters[characterIndex].characterBase.characterId;
                    } else {
                        characterId = "Vault";
                    }
                    tgd.localLog(characterId + " is where the item was found, it was supposed to be in " + self.character.id);
                    if (characterId != self.character.id) {
                        var character = _.findWhere(app.characters(), {
                            id: characterId
                        });
                        // handle refresh of other buckets
                        tgd.localLog("found the item elsewhere");
                        if (characterId == targetCharacterId) {
                            tgd.localLog("item is already where it needed to be");
                            x.items.remove(self);
                            self.characterId = targetCharacterId
                            self.character = character;
                            character.items.push(self);
                            if (cb) cb(y, x);
                        } else {
                            tgd.localLog("item is not where it needs to be");
                            x._reloadBucket(self.bucketType, undefined, function() {
                                character._reloadBucket(self.bucketType, undefined, function() {
                                    tgd.localLog("retransferring");
                                    //TODO move this function to a more general area for common use
                                    self.character.id = characterId;
                                    var newItem = Loadout.prototype.findReference(self);
                                    tgd.localLog(newItem.character.id + " has new reference of " + newItem.description);
                                    newItem.store(targetCharacterId, cb);
                                });
                            });
                        }
                    } else {*/
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        tgd.localLog("retransferring");
                        app.findReference(self, function(newItem) {
                            newItem.store(targetCharacterId, cb);
                        });
                    });
                });
                /*    }
                });*/
            } else if (result && result.ErrorCode && result.ErrorCode == 1642) {
                tgd.localLog(self._id + " error code 1642 no item slots using adhoc method for " + self.description);
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        var adhoc = new tgd.Loadout();
                        if (self._id > 0) {
                            adhoc.addUniqueItem({
                                id: self._id,
                                bucketType: self.bucketType,
                                doEquip: false
                            });
                        } else {
                            adhoc.addGenericItem({
                                hash: self.id,
                                bucketType: self.bucketType,
                                characterId: self.characterId()
                            });
                        }
                        var msa = adhoc.transfer(targetCharacterId, true);
                        if (msa.length > 0)
                            tgd.localLog(msa[0]);
                        adhoc.swapItems(msa, targetCharacterId, function() {
                            if (cb) cb(y, x);
                        });
                    });
                });
            } else if (result && result.ErrorCode && result.ErrorCode == 1648) {
                //TODO: TypeError: 'undefined' is not an object (evaluating '_.findWhere(app.characters(), { id: "Vault" }).items')
                var vaultItems = _.findWhere(app.characters(), {
                    id: "Vault"
                }).items();
                var targetItem = _.where(vaultItems, {
                    id: self.id
                });
                if (targetItem.length > 0) {
                    targetItem[0].store(targetCharacterId, function() {
                        self.character.id = targetCharacterId;
                        self.store("Vault", cb);
                    });
                }
            } else if (cb) {
                cb(y, x);
            } else if (result && result.Message) {
                tgd.localLog("transfer error 2");
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        };
    },
    store: function(targetCharacterId, callback) {
        //tgd.localLog(arguments);
        var self = this;
        var sourceCharacterId = self.characterId(),
            defaultTransferAmount = 1;
        var done = function(transferAmount) {
            //console.log("item.store " + self.description + " to " + targetCharacterId + " from " + sourceCharacterId);
            if (targetCharacterId == "Vault") {
                //tgd.localLog("*******from character to vault " + self.description);
                self.unequip(function(result) {
                    //tgd.localLog("********* " + sourceCharacterId + " calling transfer from character to vault " + result);
                    if (result === true) {
                        self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, callback));
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            tgd.localLog("transfer error 3");
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else if (sourceCharacterId !== "Vault") {
                tgd.localLog("from character to vault to character " + self.description);
                self.unequip(function(result) {
                    if (result === true) {
                        if (self.bucketType == "Subclasses") {
                            if (callback)
                                callback(self.character);
                        } else {
                            tgd.localLog(self.character.uniqueName() + " xfering item to Vault " + self.description);
                            self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, function() {
                                tgd.localLog(self.character.id + " xfered item to vault and now to " + targetCharacterId);
                                if (self.character.id == targetCharacterId) {
                                    tgd.localLog("took the long route ending it short " + self.description);
                                    if (callback) callback(self.character);
                                } else {
                                    tgd.localLog("taking the short route " + self.description);
                                    self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
                                }
                            }));
                        }
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            tgd.localLog("transfer error 4");
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else {
                tgd.localLog("from vault to character");
                self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
            }
        };
        if (self.bucketType == "Materials" || self.bucketType == "Consumables" || self.bucketType == "Ornaments") {
            if (self.primaryStat() == defaultTransferAmount) {
                done(defaultTransferAmount);
            } else if (app.autoXferStacks() === true || tgd.autoTransferStacks === true) {
                done(self.primaryStat());
            } else {
                var confirmTransfer = new tgd.transferConfirm(self, targetCharacterId, app.orderedCharacters, done);
                var defaultAction = function() {
                    confirmTransfer.finishTransfer(confirmTransfer.consolidate());
                };
                (new tgd.koDialog({
                    templateName: 'confirmTransferTemplate',
                    viewModel: confirmTransfer,
                    onFinish: defaultAction,
                    buttons: [{
                        label: app.activeText().transfer,
                        cssClass: 'btn-primary',
                        action: defaultAction
                    }, {
                        label: app.activeText().close_msg,
                        action: function(dialogItself) {
                            dialogItself.close();
                        }
                    }]
                })).title(app.activeText().transfer + " " + self.description).show(true, function() {}, function() {
                    $("input.materialsAmount").select();
                });
            }
        } else {
            var adhoc = new tgd.Loadout();
            adhoc.addUniqueItem({
                id: self._id,
                bucketType: self.bucketType,
                doEquip: false
            });
            var result = adhoc.transfer(targetCharacterId, true)[0];
            if (result && result.swapItem) {
                adhoc.promptUserConfirm([result], targetCharacterId, callback);
            } else {
                done(defaultTransferAmount);
            }
        }
    },
    normalize: function(characters) {
        app.normalizeSingle(this.description, characters, false, undefined);
    },
    consolidate: function(targetCharacterId, description, selectedCharacters) {
        //tgd.localLog(targetCharacterId);
        //tgd.localLog(description);
        var activeCharacters = (typeof selectedCharacters == "undefined") ? [] : selectedCharacters;
        var getNextStack = (function() {
            var i = 0;
            var chars = _.filter(app.orderedCharacters(), function(c) {
                return (c.id !== targetCharacterId && activeCharacters.length === 0) || (activeCharacters.indexOf(c.id) > -1);
            });
            var stacks = _.flatten(_.map(chars, function(c) {
                return _.filter(c.items(), {
                    description: description
                });
            }));
            return function() {
                return i >= stacks.length ? undefined : stacks[i++];
            };
        })();

        var nextTransfer = function(callback) {
            var theStack = getNextStack();

            if (typeof theStack == "undefined") {
                //tgd.localLog("all items consolidated");
                if (callback !== undefined) {
                    callback();
                }
                return;
            }

            //transferAmount needs to be defined once and reused bc querying the primaryStat value mid-xfers results in merging qty amounts with existing stacks.
            var transferAmount = theStack.primaryStat();

            //tgd.localLog("xfer " + transferAmount + " from: " + theStack.character.id + ", to: " + targetCharacterId);

            if (targetCharacterId == "Vault") {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == "Vault") {
                theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == targetCharacterId) {
                nextTransfer(callback);
            } else {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                        nextTransfer(callback);
                    });
                });
            }
        };

        // kick off transfers
        nextTransfer(undefined);
    },
    showExtras: function() {
        var self = this;

        var extrasPopup = new tgd.extrasPopup(self);
        (new tgd.koDialog({
            templateName: 'normalizeTemplate',
            viewModel: extrasPopup,
            buttons: [{
                label: app.activeText().normalize,
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = extrasPopup.selectedCharacters();
                    if (characters.length <= 1) {
                        BootstrapDialog.alert("Need to select two or more characters.");
                        return;
                    }
                    self.normalize(characters);
                    dialogItself.close();
                }
            }, {
                label: app.activeText().consolidate,
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = _.pluck(extrasPopup.selectedCharacters(), 'id');
                    self.consolidate(self.character.id, self.description, characters);
                    dialogItself.close();
                }
            }, {
                label: app.activeText().close_msg,
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title("Extras for " + self.description).show(true);
    },
    toggleLock: function() {
        var self = this;
        // have to use an actual character id and not the vault for lock/unlock
        var characterId = (self.characterId() == 'Vault') ? _.find(app.orderedCharacters(), function(c) {
            return c.id !== 'Vault';
        }).id : self.character.id;
        var newState = !self.locked();
        //console.log(characterId + " changing " + self._id + " to be " + (newState ? "locked" : "unlocked"));

        app.bungie.setlockstate(characterId, self._id, newState, function(results, response) {
            if (response.ErrorCode !== 1) {
                return BootstrapDialog.alert("setlockstate error: " + JSON.stringify(response));
            } else {
                //console.log(characterId + " changed " + self._id + " to be " + (newState ? "locked" : "unlocked"));
                self.locked(newState);
            }
        });
    },
    openPerkTree: function() {
        (new tgd.koDialog({
            templateName: 'itemPerkTreeTemplate',
            viewModel: this,
            buttons: [{
                label: app.activeText().cancel,
                action: function(dialog) {
                    dialog.close();
                }
            }]
        })).title("Perks for " + this.description).show(true);
    },
    openInDestinyTracker: function() {
        window.open("http://db.destinytracker.com/items/" + this.id + "#" + this.dtrUrl, tgd.openTabAs);
    },
    openInArmory: function() {
        window.open("https://www.bungie.net/en/armory/Detail?type=item&item=" + this.id, tgd.openTabAs);
    },
    openInDestinyDB: function() {
        window.open(this.href, tgd.openTabAs);
    },
    getValue: function(type) {
        var value;
        if (type == "Light") {
            value = this.primaryValues.Default;
        } else if (type == "MaxLightCSP") {
            value = this.primaryValues.MaxLightCSP;
        } else if (type == "MaxLightPercent") {
            value = this.maxLightPercent();
        } else if (type == "MaxBonusPoints") {
            value = this.primaryValues.maxLightBonus;
        } else if (type == "All" || type == "CSP") {
            value = this.primaryValues.CSP;
        } else if (_.isObject(this.stats) && type in this.stats) {
            value = parseInt(this.stats[type]);
        } else {
            value = 0;
        }
        return value;
    }
};