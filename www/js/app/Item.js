tgd.moveItemPositionHandler = function(element, item) {
    tgd.localLog("moveItemPositionHandler");
    if (app.destinyDbMode() === true) {
        tgd.localLog("destinyDbMode");
        window.open(item.href, "_system");
        return false;
    } else if (app.loadoutMode() === true) {
        tgd.localLog("loadoutMode");
        var existingItem = _.findWhere(app.activeLoadout().ids(), {
            id: item._id
        });
        if (existingItem)
            app.activeLoadout().ids.remove(existingItem);
        else {
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
                    primaryStat: item.primaryStat()
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

    if (model && model.id) {
        model.itemHash = model.id;
        model.itemInstanceId = model._id;
        model.equipRequiredLevel = 0;
        model.isEquipment = true;
    }

    _.each(model, function(value, key) {
        self[key] = value;
    });

    this.character = profile;

    this.init(model);

    this.characterId = ko.observable(self.character.id);
    this.isFiltered = ko.observable(false);
    this.isVisible = ko.pureComputed(this._isVisible, this);
    this.primaryStatValue = ko.pureComputed(this._primaryStatValue, this);
    this.columnMode = ko.computed(function() {
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
    });
    this.isEquippable = function(avatarId) {
        return ko.pureComputed(function() {
            //rules for how subclasses can be equipped
            var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
            //if it's in this character and it's equippable
            return (self.characterId() == avatarId && !self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && self.typeName.indexOf("Armsday") == -1 && equippableSubclass) || (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass && self.transferStatus < 2);
        });
    };
    this.isStoreable = function(avatarId) {
        return ko.pureComputed(function() {
            return (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses' && self.transferStatus < 2) ||
                (self.isEquipped() && self.character.id == avatarId);
        });
    };
};

Item.prototype = {
    init: function(item) {
        var self = this;
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
            tgd.localLog("found an item without a definition! " + JSON.stringify(item));
            tgd.localLog(item.itemHash);
        }
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
            //some weird stuff shows up under this bucketType w/o this filter
            if (info.bucketTypeHash == "2422292810" && info.deleteOnAction === false) {
                return;
            }
            if (info.icon === "") {
                info.icon = "/img/misc/missing_icon.png";
            }
            var itemObject = {
                id: item.itemHash,
                href: "https://destinydb.com/items/" + item.itemHash,
                _id: item.itemInstanceId,
                characterId: ko.observable(self.character.id),
                damageType: item.damageType,
                damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                isEquipment: item.isEquipment,
                isEquipped: ko.observable(item.isEquipped),
                primaryStat: ko.observable(""),
                isGridComplete: item.isGridComplete,
                locked: ko.observable(item.locked),
                description: description,
                itemDescription: itemDescription,
                classType: info.classType,
                bucketType: item.bucketType || self.character.getBucketTypeHelper(item, info),
                type: info.itemSubType,
                typeName: itemTypeName,
                tierType: info.tierType,
                tierTypeName: tierTypeName,
                icon: tgd.dataDir + info.icon,
                isUnique: false,
                primaryValues: {}
            };
            //hack for issue #442
            if (itemObject.bucketType == "Artifact") {
                itemObject.classType = tgd.DestinyClassNames[itemObject.typeName.split(" ")[0]];
            }
            itemObject.weaponIndex = tgd.DestinyWeaponPieces.indexOf(itemObject.bucketType);
            itemObject.armorIndex = tgd.DestinyArmorPieces.indexOf(itemObject.bucketType);
            if (itemObject.armorIndex > -1) {
                app.armorViewBy.subscribe(function(type) {
                    self.primaryStat(self.primaryValues[type == "Light" ? "Default" : "Stats"]);
                });
            }
            if (item.id) {
                itemObject.perks = item.perks;
            } else if (item.perks.length > 0) {
                var talentGrid = _talentGridDefs[item.talentGridHash];
                itemObject.perks = [];
                if (talentGrid && talentGrid.nodes) {
                    _.each(item.perks, function(perk) {
                        if (perk.perkHash in window._perkDefs) {
                            var p = window._perkDefs[perk.perkHash];
                            //There is an inconsistency between perkNames in Destiny for example:
                            /* Boolean Gemini - Has two perks David/Goliath which is also called One Way/Or Another
                               This type of inconsistency leads to issues with filtering therefore p.perkHash must be used
                            */
                            var nodeIndex = talentGrid.nodes.indexOf(
                                _.filter(talentGrid.nodes, function(o) {
                                    return _.flatten(_.pluck(o.steps, 'perkHashes')).indexOf(p.perkHash) > -1;
                                })[0]
                            );
                            itemObject.perks.push({
                                iconPath: tgd.dataDir + p.displayIcon,
                                name: p.displayName,
                                description: '<strong>' + p.displayName + '</strong>: ' + p.displayDescription,
                                active: perk.isActive,
                                isExclusive: talentGrid.exclusiveSets.indexOf(nodeIndex)
                            });
                        }
                    });
                    var perkHashes = _.pluck(item.perks, 'perkHash'),
                        perkNames = _.pluck(itemObject.perks, 'name'),
                        talentPerks = {};
                    var talentGridNodes = talentGrid.nodes;
                    _.each(item.nodes, function(node) {
                        if (node.isActivated && node.hidden === false) {
                            var nodes = _.findWhere(talentGridNodes, {
                                nodeHash: node.nodeHash
                            });
                            if (nodes && nodes.steps) {
                                var perk = nodes.steps[node.stepIndex];
                                if ((tgd.DestinyUnwantedNodes.indexOf(perk.nodeStepName) == -1) &&
                                    (perkNames.indexOf(perk.nodeStepName) == -1) &&
                                    (perk.perkHashes.length === 0 || perkHashes.indexOf(perk.perkHashes[0]) === -1)) {
                                    talentPerks[perk.nodeStepName] = {
                                        active: true,
                                        name: perk.nodeStepName,
                                        description: '<strong>' + perk.nodeStepName + '</strong>: ' + perk.nodeStepDescription,
                                        iconPath: tgd.dataDir + perk.icon,
                                        isExclusive: -1
                                    };
                                }
                            }
                        }
                    });
                    _.each(talentPerks, function(perk) {
                        itemObject.perks.push(perk);
                    });
                }
            }
            itemObject.hasLifeExotic = _.where(itemObject.perks, {
                name: "The Life Exotic"
            }).length > 0;
            if (item.progression) {
                itemObject.progression = _.filter(itemObject.perks, function(perk) {
                    return perk.active === false && perk.isExclusive === -1;
                }).length === 0;
            }
            if (item.primaryStat) {
                if (item.primaryStat && item.primaryStat.value) {
                    itemObject.primaryStat(item.primaryStat.value);
                } else {
                    itemObject.primaryStat(item.primaryStat);
                }
            }
            if (item.stats.length > 0) {
                itemObject.stats = {};
                _.each(item.stats, function(stat) {
                    if (stat.statHash in window._statDefs) {
                        var p = window._statDefs[stat.statHash];
                        itemObject.stats[p.statName] = stat.value;
                    }
                });
                itemObject.primaryValues['Stats'] = tgd.sum(_.values(itemObject.stats));
            }
            if (item && item.objectives && item.objectives.length > 0) {
                var progress = (tgd.average(_.map(item.objectives, function(objective) {
                    var result = 0;
                    if (objective.objectiveHash in _objectiveDefs && _objectiveDefs[objective.objectiveHash] && _objectiveDefs[objective.objectiveHash].completionValue) {
                        result = objective.progress / _objectiveDefs[objective.objectiveHash].completionValue;
                    }
                    return result;
                })) * 100).toFixed(0) + "%";
                var primaryStat = (itemObject.primaryStat() === "") ? progress : itemObject.primaryStat() + "/" + progress;
                itemObject.primaryStat(primaryStat);
            }

            if (itemObject.typeName && itemObject.typeName == "Emblem") {
                itemObject.backgroundPath = app.makeBackgroundUrl(info.secondaryIcon);
            }
            if (itemObject.bucketType == "Materials" || itemObject.bucketType == "Consumables") {
                itemObject.primaryStat(item.stackSize);
                itemObject.maxStackSize = info.maxStackSize;
            } else if ((itemObject.bucketType == "Lost Items" || itemObject.bucketType == "Invisible") && item.stackSize > 1) {
                itemObject.primaryStat(item.stackSize);
            }
            itemObject.primaryValues['Default'] = itemObject.primaryStat();
            $.extend(self, itemObject);
        }
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
        if (type == "Engram" && this.description.indexOf("Engram") > -1 && this.isEquipment === false) {
            return true;
        } else if (type in tgd.DestinyGeneralItems && tgd.DestinyGeneralItems[type].indexOf(this.id) > -1) {
            return true;
        } else {
            return false;
        }
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
                    return name.split(" ")[0];
                });
                dmgFilter = $parent.dmgFilter().length === 0 || _.intersection($parent.dmgFilter(), types).length > 0;
                armorFilter = $parent.armorFilter() == "0" || $parent.armorFilter() == self.bucketType;
            }
            progressFilter = $parent.progressFilter() == "0" || self.hashProgress($parent.progressFilter());
        }
        generalFilter = $parent.generalFilter() == "0" || self.hasGeneral($parent.generalFilter());
        showDuplicate = $parent.customFilter() === false || ($parent.customFilter() === true && self.isFiltered() === true);

        var isVisible = (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (weaponFilter) && (armorFilter) && (generalFilter) && (showDuplicate);
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
                otherItems = _.filter(self.character.items(), function(item) {
                    return (item._id != self._id && item.bucketType == self.bucketType);
                });
            //console.log("other items: " + _.pluck(otherItems, 'description'));
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
                    tgd.localLog(item.description);
                    /* still haven't found a match */
                    if (otherEquipped === false) {
                        if (item != self && item.equip) {
                            tgd.localLog("trying to equip " + item.description);
                            item.equip(self.characterId(), function(isEquipped, result) {
                                tgd.localLog(item.description + " result was " + isEquipped);
                                if (isEquipped === true) {
                                    otherEquipped = true;
                                    callback(true);
                                } else if (isEquipped === false && result && result.ErrorCode && result.ErrorCode === 1634) {
                                    callback(false);
                                } else {
                                    tryNextItem();
                                    tgd.localLog("tryNextItem");
                                }
                            });
                        } else {
                            tryNextItem();
                            tgd.localLog("tryNextItem");
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
                        return item.isEquipped();
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
        //tgd.localLog( self.description );
        app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result) {
            //tgd.localLog("app.bungie.transfer after");
            //tgd.localLog(arguments);			
            if (result && result.Message && result.Message == "Ok") {
                if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
                    /*
                     * Whatever happens, make sure 'self' is always preserved in case there were/are chained transfers before/after.
                     * All we're looking to do is make the GUI appear correct. The transfer has already happened successfully.
                     * Simple cases:
                     * 1) Target has no existing items, so simply move self from one players' items list to the other.
                     * 2) Target has existing items, but all existing stacks full, so simply do the same as previous case.
                     * Edge cases:
                     * 1) If self gets swallowed (ie. completely added to an existing stack) then the stack that's swallowing needs to
                     * be removed and self adjusted to appear to be that swallowing stack.
                     * 2) If self gets swallowed but there's overflow (ie. added to an existing stack but hit maxStackSize and a new
                     * stack needs to be created visually) then self needs to be adjusted to appear as the newly created stack.
                     * 3) If self.primaryStat is < amount then there was a previous transfer that overflowed and now we've got an
                     * underflow. self needs to be the 'right' most stack that visually gets removed and added to the new character.
                     * Cleanup cases:
                     * 1) When multiple stacks exist on the source character, and the user has selected a partial transfer from a stack
                     * that's not at the end of the list, we need to make the counts correct by shuffling things 'left' and potentially
                     * removing anything on the right that went < 0.
                     * Random notes:
                     * 1) Bungie API lets you move more than a stacks worth of an item, so logic is needed to visually break up stacks
                     * if they're > maxStackSize for that particular item.					 
                     */

                    tgd.localLog("[from: " + sourceCharacterId + "] [to: " + targetCharacterId + "] [amount: " + amount + "]");
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
                    var idxSelf = x.items.indexOf(self);
                    // remove self from x.items
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
                            // self gets added to y.items as a new stack with (amount - tmpAmount)
                            newAmount = amount - tmpAmount;
                        }
                    } else {
                        // self gets added to y.items as a new stack with (amount)
                        newAmount = amount;
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
                    tgd.localLog("---------------------");
                } else {
                    tgd.localLog("removing " + self.description + " from " + x.uniqueName() + " currently at " + x.items().length);
                    x.items.remove(function(item) {
                        return item._id == self._id;
                    });
                    tgd.localLog("after removal " + x.items().length);
                    self.character = y;
                    y.items.push(self);
                    setTimeout(function() {
                        self.characterId(targetCharacterId);
                    }, 500);
                    tgd.localLog("adding " + self.description + " to " + y.uniqueName());
                }
                //not sure why this is nessecary but w/o it the xfers have a delay that cause free slot errors to show up
                setTimeout(function() {
                    if (cb) cb(y, x);
                }, 500);
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
                                primaryStat: self.primaryStat()
                            });
                        }
                        var msa = adhoc.transfer(targetCharacterId, true);
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
            transferAmount = 1;
        //tgd.localLog("item.store " + self.description + " to " + targetCharacterId + " from " + sourceCharacterId);
        var done = function() {
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
        if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
            if (self.primaryStat() == 1) {
                done();
            } else if (app.autoXferStacks() === true || tgd.autoTransferStacks === true) {
                transferAmount = self.primaryStat();
                done();
            } else {
                var characterTotal = 0;
                var dialogItself = (new tgd.dialog({
                        message: function() {
                            var itemTotal = 0;
                            for (i = 0; i < app.orderedCharacters().length; i++) {
                                var c = app.orderedCharacters()[i];
                                var charTotal = _.reduce(
                                    _.filter(c.items(), {
                                        description: self.description
                                    }),
                                    function(memo, j) {
                                        return memo + j.primaryStat();
                                    },
                                    0);
                                if (self.character == c) {
                                    characterTotal = charTotal;
                                }
                                itemTotal = itemTotal + charTotal;
                            }
                            var $content = $(
                                '<div><div class="controls controls-row">' + app.activeText().transfer_amount + ': ' +
                                '<button type="button" class="btn btn-default" id="dec">  -  </button>' +
                                ' <input type="text" id="materialsAmount" value="' + self.primaryStat() + '" size="4"> ' +
                                '<button type="button" class="btn btn-default" id="inc">  +  </button>' +
                                '<button type="button" class="btn btn-default pull-right" id="all"> ' + app.activeText().transfer_all + ' (' + characterTotal + ') </button>' +
                                '<button type="button" class="btn btn-default pull-right" id="one"> ' + app.activeText().transfer_one + ' </button>' +
                                '</div>' +
                                '<div><hr></div>' +
                                '<div class="controls controls-row">' +
                                '<label><input type="checkbox" id="consolidate" /> ' + app.activeText().transfer_con + ' (' + itemTotal + '))</label>' +
                                '<br><label><input type="checkbox" id="neverAsk" /> ' + app.activeText().transfer_ask + '</label>' +
                                '</div></div>');
                            var btnDec = $content.find('#dec');
                            btnDec.click(function() {
                                var num = parseInt($("input#materialsAmount").val());
                                if (!isNaN(num)) {
                                    $("input#materialsAmount").val(Math.max(num - 1, 1));
                                }
                            });
                            var btnInc = $content.find('#inc');
                            btnInc.click(function() {
                                var num = parseInt($("input#materialsAmount").val());
                                if (!isNaN(num)) {
                                    $("input#materialsAmount").val(Math.min(num + 1, characterTotal));
                                }
                            });
                            var btnOne = $content.find('#one');
                            btnOne.click(function() {
                                var num = parseInt($("input#materialsAmount").val());
                                if (!isNaN(num)) {
                                    $("input#materialsAmount").val(1);
                                }
                            });
                            var btnAll = $content.find('#all');
                            btnAll.click(function() {
                                var num = parseInt($("input#materialsAmount").val());
                                if (!isNaN(num)) {
                                    $("input#materialsAmount").val(characterTotal);
                                }
                            });
                            var inputAmt = $content.find('#materialsAmount');
                            var handleCheckChanged = function(checked) {
                                btnDec.attr("disabled", checked);
                                btnInc.attr("disabled", checked);
                                btnOne.attr("disabled", checked);
                                btnAll.attr("disabled", checked);
                                inputAmt.attr("disabled", checked);
                                inputAmt.attr("readOnly", checked);
                            };
                            $content.find('#consolidate').click(function() {
                                handleCheckChanged(this.checked);
                            });
                            $content.find('#neverAsk').click(function() {
                                app.autoXferStacks(true);
                            });
                            return $content;
                        },
                        buttons: [{
                            label: 'Transfer',
                            cssClass: 'btn-primary',
                            action: function() {
                                finishTransfer($("input#consolidate")[0].checked);
                            }
                        }, {
                            label: 'Close',
                            action: function(dialogItself) {
                                dialogItself.close();
                            }
                        }]
                    })).title("Transfer " + self.description).show(true),
                    finishTransfer = function(consolidate) {
                        if (consolidate) {
                            self.consolidate(targetCharacterId, self.description);
                            dialogItself.modal.close();
                        } else {
                            transferAmount = parseInt($("input#materialsAmount").val());
                            if (!isNaN(transferAmount) && (transferAmount > 0) && (transferAmount <= characterTotal)) {
                                done();
                                dialogItself.modal.close();
                            } else {
                                BootstrapDialog.alert(app.activeText().invalid_transfer_amount + transferAmount);
                            }
                        }
                    };
                setTimeout(function() {
                    $("#materialsAmount").select().bind("keyup", function(e) {
                        if (e.keyCode == 13) {
                            finishTransfer(false);
                        }
                    });
                }, 500);
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
                adhoc.promptUserConfirm([result], targetCharacterId);
            } else {
                done();
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
                return (c.id !== targetCharacterId && activeCharacters.length == 0) || (activeCharacters.indexOf(c.id) > -1);
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
    extrasGlue: function() {
        var self = this;

        var selectedStatus = [];
        for (i = 0; i < app.orderedCharacters().length; i++) {
            var id = app.orderedCharacters()[i].id;
            selectedStatus[id] = (id !== "Vault");
        }

        var dialogItself = (new tgd.dialog({
            message: function(dialogItself) {
                var getTotalSelectedItemCount = function() {
                    var c = 0;
                    var totalSelectedItemCount = 0;
                    for (i = 0; i < app.orderedCharacters().length; i++) {
                        if (selectedStatus[(app.orderedCharacters()[i]).id] === true) {
                            var ct = _.reduce(
                                _.filter(app.orderedCharacters()[i].items(), {
                                    description: self.description
                                }),
                                function(memo, i) {
                                    return memo + i.primaryStat();
                                },
                                0);
                            c = c + parseInt(ct);
                        }
                    }
                    return c;
                };

                var $content = $(tgd.normalizeTemplate({
                    item: self,
                    characters: app.orderedCharacters(),
                    selected: selectedStatus,
                    total: getTotalSelectedItemCount()
                }));

                var charButtonClicked = function(self, id) {
                    selectedStatus[id] = !selectedStatus[id];
                    $content.find('#total').text(getTotalSelectedItemCount());
                    self.find('img').css('border', (selectedStatus[id] === true) ? "solid 3px yellow" : "none");
                };

                $.each(app.orderedCharacters(), function(i, val) {
                    var id = val.id;
                    var sel = "#char" + i.toString();
                    $content.find(sel).click(function() {
                        charButtonClicked($(this), id);
                    });
                });
                return $content;
            },
            buttons: [{
                label: 'Normalize',
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = _.filter(app.orderedCharacters(), function(c) {
                        return selectedStatus[c.id] === true;
                    });
                    if (characters.length <= 1) {
                        BootstrapDialog.alert("Need to select two or more characters.");
                        return;
                    }
                    self.normalize(characters);
                    dialogItself.close();
                }
            }, {
                label: 'Consolidate',
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = _.pluck(_.filter(app.orderedCharacters(), function(c) {
                        return selectedStatus[c.id] === true;
                    }), 'id');
                    self.consolidate(self.character.id, self.description, characters);
                    dialogItself.close();
                }
            }, {
                label: 'Close',
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
    getValue: function(type) {
        var value;
        if (type == "Light") {
            value = this.primaryStatValue();
        } else if (type == "All") {
            value = tgd.sum(_.values(this.stats));
        } else if (_.isObject(this.stats) && type in this.stats) {
            value = parseInt(this.stats[type]);
        } else {
            value = 0;
        }
        return value;
    }
};