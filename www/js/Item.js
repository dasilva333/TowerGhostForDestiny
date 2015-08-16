var dataDir = "data";

var Item = function(model, profile, ignoreDups) {
    var self = this;

    _.each(model, function(value, key) {
        self[key] = value;
    });

    this.character = profile;

    this.init(model, ignoreDups);

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
}

Item.prototype = {
    init: function(item, ignoreDups) {
        var self = this;
        if (!(item.itemHash in _itemDefs)) {
            tgd.localLog("found an item without a definition! " + JSON.stringify(item));
            tgd.localLog(item.itemHash);
            return;
        }
        var info = _itemDefs[item.itemHash];
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
            if (info.bucketTypeHash == "2422292810" && info.deleteOnAction == false) {
                return;
            }
            var itemObject = {
                id: item.itemHash,
                href: "https://destinydb.com/items/" + item.itemHash,
                _id: item.itemInstanceId,
                characterId: self.character.id,
                damageType: item.damageType,
                damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                isEquipment: item.isEquipment,
                isEquipped: ko.observable(item.isEquipped),
                primaryStat: ko.observable(""),
                isGridComplete: item.isGridComplete,
                locked: item.locked,
                description: description,
                itemDescription: itemDescription,
                bucketType: self.character.getBucketTypeHelper(item, info),
                type: info.itemSubType,
                typeName: itemTypeName,
                tierType: info.tierType,
                tierTypeName: tierTypeName,
                icon: dataDir + info.icon,
                isUnique: false
            };
            if (ignoreDups == undefined || ignoreDups == false) {
                tgd.duplicates.push(item.itemHash);
            }
            if (item.primaryStat) {
                itemObject.primaryStat(item.primaryStat.value);
            }
            if (info.bucketTypeHash == "2197472680" && item.progression) {
                itemObject.primaryStat(((item.progression.currentProgress / item.progression.nextLevelAt) * 100).toFixed(0) + "%");
            }
            if (item.progression) {
                itemObject.progression = (item.progression.progressToNextLevel <= 1000 && item.progression.currentProgress > 0);
            }
            itemObject.weaponIndex = tgd.DestinyWeaponPieces.indexOf(itemObject.bucketType);
            itemObject.armorIndex = tgd.DestinyArmorPieces.indexOf(itemObject.bucketType);
            if (item.perks.length > 0) {
                itemObject.perks = item.perks.map(function(perk) {
                    if (perk.perkHash in window._perkDefs) {
                        var p = window._perkDefs[perk.perkHash];
                        return {

                            iconPath: dataDir + p.displayIcon,
                            name: p.displayName,
                            description: '<strong>' + p.displayName + '</strong>: ' + p.displayDescription,
                            active: perk.isActive
                        }
                    } else {
                        return perk;
                    }
                });
                if (item.talentGridHash in _talentGridDefs) {
                    var perkHashes = _.pluck(item.perks, 'perkHash'),
                        perkNames = _.pluck(itemObject.perks, 'name'),
                        talentPerks = {};
                    var talentGridNodes = _talentGridDefs[item.talentGridHash].nodes;
                    _.each(item.nodes, function(node) {
                        if (node.isActivated && node.hidden == false) {
                            var nodes = _.findWhere(talentGridNodes, {
                                nodeHash: node.nodeHash
                            });
                            var perk = nodes.steps[node.stepIndex];
                            if ((tgd.DestinyUnwantedNodes.indexOf(perk.nodeStepName) == -1) &&
                                (perkNames.indexOf(perk.nodeStepName) == -1) &&
                                (perk.perkHashes.length == 0 || perkHashes.indexOf(perk.perkHashes[0]) == -1)) {
                                talentPerks[perk.nodeStepName] = {
                                    active: true,
                                    name: perk.nodeStepName,
                                    description: '<strong>' + perk.nodeStepName + '</strong>: ' + perk.nodeStepDescription,
                                    iconPath: dataDir + perk.icon
                                };
                            }
                        }
                    });
                    _.each(talentPerks, function(perk) {
                        itemObject.perks.push(perk);
                    });
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
            }
            if (itemObject.typeName && itemObject.typeName == "Emblem") {
                itemObject.backgroundPath = app.makeBackgroundUrl(info.secondaryIcon);
            }
            if (itemObject.bucketType == "Materials" || itemObject.bucketType == "Consumables") {
                itemObject.primaryStat(item.stackSize);
                itemObject.maxStackSize = info.maxStackSize;
            }
            if ((itemObject.bucketType == "Lost Items" || itemObject.bucketType == "Messages") && item.stackSize > 1) {
                itemObject.primaryStat(item.stackSize);
            }
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
        var $parent = app,
            self = this;

        if (typeof self.id == "undefined") {
            return false;
        }
        var searchFilter = $parent.searchKeyword() == '' || self.hasPerkSearch($parent.searchKeyword()) ||
            ($parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) > -1);
        var dmgFilter = $parent.dmgFilter().length == 0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
        var setFilter = $parent.setFilter().length == 0 || $parent.setFilter().indexOf(self.id) > -1;
        var tierFilter = $parent.tierFilter() == 0 || $parent.tierFilter() == self.tierType;
        var progressFilter = $parent.progressFilter() == 0 || self.hashProgress($parent.progressFilter());
        var typeFilter = $parent.typeFilter() == 0 || $parent.typeFilter() == self.typeName;
        var dupes = _.filter(tgd.duplicates(), function(id) {
            return id == self.id
        }).length;
        var showDuplicate = $parent.showDuplicate() == false || ($parent.showDuplicate() == true && dupes > 1);
        /*tgd.localLog( "searchFilter: " + searchFilter);
		tgd.localLog( "dmgFilter: " + dmgFilter);
		tgd.localLog( "setFilter: " + setFilter);
		tgd.localLog( "tierFilter: " + tierFilter);
		tgd.localLog( "progressFilter: " + progressFilter);
		tgd.localLog( "typeFilter: " + typeFilter);
		tgd.localLog("keyword is: " + $parent.searchKeyword());
		tgd.localLog("keyword is empty " + ($parent.searchKeyword() == ''));
		tgd.localLog("keyword has perk " + self.hasPerkSearch($parent.searchKeyword()));
		tgd.localLog("perks are " + JSON.stringify(self.perks));
		tgd.localLog("description is " + self.description);
		tgd.localLog("keyword has description " + ($parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) >-1));*/
        return (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (typeFilter) && (showDuplicate);
    },
    /* helper function that unequips the current item in favor of anything else */
    unequip: function(callback, allowReplacement, excludeExotic) {
        var self = this;
        //tgd.localLog('trying to unequip too!');
        if (self.isEquipped() == true) {
            //tgd.localLog("and its actually equipped");
            var otherEquipped = false,
                itemIndex = -1,
                otherItems = [];
            self.character.items().forEach(function(item) {
                if (item != self && item.bucketType == self.bucketType) {
                    otherItems.push(item);
                }
            });
            otherItems = _.filter(otherItems, function(item) {
                return (!excludeExotic || excludeExotic && item.tierType !== 6);
            });
            if (otherItems.length > 0) {
                /* if the only remainings item are exotic ensure the other buckets dont have an exotic equipped */
                var minTier = _.min(_.pluck(otherItems, 'tierType'));
                var tryNextItem = function() {
                        var item = otherItems[++itemIndex];
                        if (_.isUndefined(item)) {
                            return BootstrapDialog.alert(app.activeText().cannot_unequip + self.description);
                        }
                        //tgd.localLog(item.description);
                        /* still haven't found a match */
                        if (otherEquipped == false) {
                            if (item != self && item.equip) {
                                //tgd.localLog("trying to equip " + item.description);
                                item.equip(self.characterId, function(isEquipped) {
                                    //tgd.localLog( item.description + " result was " + isEquipped);
                                    if (isEquipped == true) {
                                        otherEquipped = true;
                                        callback(true);
                                    } else {
                                        tryNextItem(); /*tgd.localLog("tryNextItem")*/
                                    }
                                });
                            } else {
                                tryNextItem()
                                    //tgd.localLog("tryNextItem")
                            }
                        }
                    }
                    //tgd.localLog("tryNextItem")
                    //tgd.localLog("trying to unequip item, the min tier of the items I can equip is: " + minTier);
                if (minTier == 6) {
                    var otherItemUnequipped = false;
                    var otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                    otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                    _.each(otherBucketTypes, function(bucketType) {
                        var itemEquipped = self.character.itemEquipped(bucketType);
                        if (itemEquipped && itemEquipped.tierType && itemEquipped.tierType == 6) {
                            //tgd.localLog("going to unequip " + itemEquipped.description);
                            itemEquipped.unequip(function(result) {
                                //unequip was successful
                                if (result) {
                                    tryNextItem();
                                }
                                //unequip failed
                                else {
                                	/* I'm a lazy bitch and don't know the APIs but can we grep the remaining bucket
                                	 * space from the other characters/vault for an equippable item that isn't an item
                                	 * from the loadout you've selected and swap it over to the character...then retry
                                	 * the swap before failing? A warning dialog might still be nice since the app
                                	 * didn't "plan" on this and tell the user via the loadout dialog that x will be
                                	 * swapped with y.  The only situation that I know of where this dialog could pop
                                	 * is when pulling armor/weapons out and only exotics remain so we're thus unable to
                                	 * swap the remaining items.  Pop a quick legendary or lower item over into the failed
                                	 * swap bucket and retry...presto!
                                	 */
                                    BootstrapDialog.alert(app.activeText().unable_unequip + itemEquipped.description);
                                    callback(false);
                                }
                            }, false, true);
                            otherItemUnequipped = true;
                        }
                    });
                    if (!otherItemUnequipped) {
                        //tgd.localLog("no other exotic equipped, safe to equip");
                        tryNextItem();
                    }
                } else {
                    tryNextItem();
                }
            } else if (allowReplacement) {
                //tgd.localLog("unequip allows replacement");
                var otherItems = _.filter(_.where(self.character.items(), {
                    bucketType: self.bucketType
                }), function(item) {
                    return item._id !== self._id;
                });
                if (otherItems.length > 0) {
                    //tgd.localLog('found an item an item to equip instead ' + otherItems[0].description);
                    otherItems[0].equip(self.character.id, function() {
                        tgd.localLog("finished equipping other item");
                        callback(true);
                    }, true);
                } else {
                    tgd.localLog("no item to replace it");
                    callback(false);
                }
            } else {
                //tgd.localLog("refused to unequip");
                callback(false);
            }
        } else {
            //tgd.localLog("but not equipped");
            callback(true);
        }
    },
    equip: function(targetCharacterId, callback, allowReplacement) {
        var self = this;
        var done = function() {
            tgd.localLog("making bungie call to equip " + self.description);
            app.bungie.equip(targetCharacterId, self._id, function(e, result) {
                if (result && result.Message && result.Message == "Ok") {
                    //tgd.localLog("result was OKed");
                    //tgd.localLog(result);
                    self.isEquipped(true);
                    self.character.items().forEach(function(item) {
                        if (item != self && item.bucketType == self.bucketType) {
                            item.isEquipped(false);
                        }
                    });
                    if (self.bucketType == "Emblem") {
                        self.character.icon(app.makeBackgroundUrl(self.icon, true));
                        self.character.background(self.backgroundPath);
                    }
                    if (callback) callback(true);
                } else {
                    /* this is by design if the user equips something they couldn't the app shouldn't assume a replacement unless it's via loadouts */
                    if (callback) callback(false);
                    else if (result && result.Message) {
                        BootstrapDialog.alert(result.Message);
                    }
                    //TODO perhaps log this condition and determine the cause
                    else {
                        BootstrapDialog.alert(app.activeText().cannot_equip + (result && result.error) ? result.error : "");
                    }
                }
            });
        }
        var sourceCharacterId = self.characterId;
        tgd.localLog("equip called from " + sourceCharacterId + " to " + targetCharacterId);
        if (targetCharacterId == sourceCharacterId) {
            tgd.localLog("item is already in the character");
            /* if item is exotic */
            if (self.tierType == 6 && allowReplacement) {
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
                        otherExotic[0].unequip(done, allowReplacement);
                    }
                });
                if (otherExoticFound == false) {
                    done();
                }
            } else {
                //tgd.localLog("request is not part of a loadout");
                done()
            }
        } else {
            tgd.localLog("item is NOT already in the character");
            self.store(targetCharacterId, function(newProfile) {
                tgd.localLog("item is now in the target destination");
                self.character = newProfile;
                self.characterId = newProfile.id;
                self.equip(targetCharacterId, callback, allowReplacement);
            }, allowReplacement);
        }
    },
    transfer: function(sourceCharacterId, targetCharacterId, amount, cb) {
        //tgd.localLog("Item.transfer");
        //tgd.localLog(arguments);
        var self = this,
            x, y, characters = app.characters();
        if (characters.length == 0) {
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
        //TODO: This only seems to be happening now for people whose Vault profile didnt load
        if (_.isUndefined(y)) {
            /*ga('send', 'exception', {
                'exDescription': "Target character not found> " + targetCharacterId + " " + _.pluck(app.characters(), 'id'),
                'exFatal': false,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    tgd.localLog("crash reported");
                }
            });*/
            app.refresh();
            return BootstrapDialog.alert("Error has occured, please report this issue to my Github. Target character not found " + targetCharacterId);
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

                    var remainder = self.primaryStat() - amount;
                    var isOverflow = existingItem == undefined ? false : ((existingItem.primaryStat() + amount) > existingItem.maxStackSize);
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
                        var theClone = self.clone();
                        theClone.characterId = sourceCharacterId;
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
                    var idxExistingItem = undefined;
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
                    self.characterId = targetCharacterId;
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
                            var theClone = self.clone();
                            theClone.characterId = targetCharacterId;
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

                                cur.primaryStat(cur.primaryStat() + howMuch)
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
                    x.items.remove(self);
                    self.characterId = targetCharacterId
                    self.character = y;
                    y.items.push(self);
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
                BootstrapDialog.alert(result.Message);

            }
        });
    },
    handleTransfer: function(targetCharacterId, cb, allowReplacement) {
        var self = this;
        return function(y, x, result) {
            if (result && result.ErrorCode && (result.ErrorCode == 1656 || result.ErrorCode == 1623)) {
                tgd.localLog("reloading bucket " + self.bucketType);
                /*var characterId = app.characters()[1].id;
				var instanceId = app.characters()[1].weapons()[0]._id;*/
                app.bungie.getAccountSummary(function(results) {
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
                        /* handle refresh of other buckets */
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
                                    newItem.store(targetCharacterId, cb, allowReplacement);
                                });
                            });
                        }
                    } else {
                        x._reloadBucket(self.bucketType, undefined, function() {
                            y._reloadBucket(self.bucketType, undefined, function() {
                                tgd.localLog("retransferring");
                                //TODO move this function to a more general area for common use
                                var newItem = Loadout.prototype.findReference(self);
                                newItem.store(targetCharacterId, cb, allowReplacement);
                            });
                        });
                    }
                });
            }
            //this condition only applies to armor/weapons until loadouts can support mats
            else if (result && result.ErrorCode && result.ErrorCode == 1642 && self._id > 0) {
                tgd.localLog(self._id + " error code 1642 no item slots using adhoc method for " + self.description);
                var adhoc = new Loadout();
                adhoc.addItem({
                    id: self._id,
                    bucketType: self.bucketType,
                    doEquip: false
                });
                var msa = adhoc.transfer(targetCharacterId, true);
                adhoc.swapItems(msa, targetCharacterId, function() {
                    cb(y, x);
                });
            } else if (result && result.Message) {
                BootstrapDialog.alert(result.Message);
            } else if (cb) {
                cb(y, x);
            }
        }
    },
    store: function(targetCharacterId, callback, allowReplacement) {
        //tgd.localLog(arguments);
        var self = this;
        var sourceCharacterId = self.character.id,
            transferAmount = 1;
        tgd.localLog("item.store " + self.description + " to " + targetCharacterId + " from " + sourceCharacterId);
        var done = function() {
            if (targetCharacterId == "Vault") {
                tgd.localLog("from character to vault " + self.description);
                self.unequip(function(result) {
                    tgd.localLog(sourceCharacterId + " calling transfer from character to vault " + result);
                    if (result == true) {
                        self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, callback, allowReplacement));
                    } else if (result == false && callback) {
                        callback(self.character);
                    }
                }, allowReplacement);
            } else if (sourceCharacterId !== "Vault") {
                tgd.localLog("from character to vault to character " + self.description);
                self.unequip(function(result) {
                    if (result) {
                        if (self.bucketType == "Subclasses") {
                            if (callback)
                                callback(self.character);
                        } else {
                            tgd.localLog("xfering item to Vault " + self.description);
                            self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, function() {
                                tgd.localLog("xfered item to vault and now to " + targetCharacterId);
                                if (self.character.id == targetCharacterId) {
                                    tgd.localLog("took the long route ending it short " + self.description);
                                    if (callback) callback(self.character);
                                } else {
                                    tgd.localLog("taking the short route " + self.description);
                                    self.transfer("Vault", targetCharacterId, transferAmount, callback);
                                }
                            }, allowReplacement));
                        }
                    }
                    if (result == false && callback)
                        callback(self.character);
                }, allowReplacement);
            } else {
                tgd.localLog("from vault to character");
                self.transfer("Vault", targetCharacterId, transferAmount, callback);
            }
        }
        if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
            if (self.primaryStat() == 1) {
                done();
            } else if (app.autoTransferStacks() == true) {
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
                                '<label><input type="checkbox" id="consolidate" /> Consolidate (pull from all characters (' + itemTotal + '))</label>' +
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
                    }
                setTimeout(function() {
                    $("#materialsAmount").select().bind("keyup", function(e) {
                        if (e.keyCode == 13) {
                            finishTransfer(false);
                        }
                    })
                }, 500);
            }
        } else {
            var adhoc = new Loadout();
            adhoc.addItem({
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
    consolidate: function(targetCharacterId, description) {
        //tgd.localLog(targetCharacterId);
        //tgd.localLog(description);

        var getNextStack = (function() {
            var i = 0;
            var chars = _.filter(app.orderedCharacters(), function(c) {
                return c.id !== targetCharacterId;
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
            if (theStack == undefined) {
                //tgd.localLog("all items consolidated");
                if (callback !== undefined) {
                    callback();
                }
                return;
            }

            //tgd.localLog("xfer " + theStack.primaryStat() + " from: " + theStack.character.id + ", to: " + targetCharacterId);

            if (targetCharacterId == "Vault") {
                theStack.transfer(theStack.character.id, "Vault", theStack.primaryStat(), function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == "Vault") {
                theStack.transfer("Vault", targetCharacterId, theStack.primaryStat(), function() {
                    nextTransfer(callback);
                });
            } else {
                theStack.transfer(theStack.character.id, "Vault", theStack.primaryStat(), function() {
                    theStack.transfer("Vault", targetCharacterId, theStack.primaryStat(), function() {
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
                        if (selectedStatus[(app.orderedCharacters()[i]).id] == true) {
                            var ct = _.reduce(
                                _.filter(app.orderedCharacters()[i].items(), {
                                    description: self.description
                                }),
                                function(memo, i) {
                                    return memo + i.primaryStat();
                                },
                                0);
                            c = c + ct;
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
                    self.find('img').css('border', (selectedStatus[id] == true ? "solid 3px yellow" : "none"));
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
                        return selectedStatus[c.id] == true;
                    });
                    if (characters.length <= 1) {
                        BootstrapDialog.alert("Need to select two or more characters.");
                        return;
                    }
                    self.normalize(characters);
                    dialogItself.close();
                }
            }, {
                label: 'Close',
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title("Extras for " + self.description).show(true);
    }
}
