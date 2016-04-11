tgd.loadoutManager = function(loadouts, dialog) {
    var self = this;

    self.loadouts = loadouts;
};

tgd.loadoutId = 0;

tgd.LoadoutItem = function(model) {
    var self = this;

    _.each(model, function(value, key) {
        self[key] = value;
    });
    var _doEquip = (model && typeof model.hash == "undefined") ? ((self.doEquip && self.doEquip.toString() == "true") || false) : false;
    self.doEquip = ko.observable(_doEquip);
};

tgd.Loadout = function(model, isItems) {
    var self = this;

    _.each(model, function(value, key) {
        self[key] = value;
    });
    this.loadoutId = tgd.loadoutId++;
    this.name = ko.observable(self.name || "");
    this.ids = ko.observableArray();
    this.generics = ko.observableArray();
    this.items = ko.pureComputed(function() {
        var _items = [];
        _.each(self.ids(), function(equip) {
            if (equip) {
                var itemFound = self.findItemById(equip.id);
                if (itemFound) {
                    itemFound.doEquip = equip.doEquip;
                    itemFound.markAsEquip = self.markAsEquip;
                    if (equip && equip.bonusOn) {
                        itemFound.bonusOn = equip.bonusOn;
                    }
                    _items.push(itemFound);
                }
            }
        });
        _.each(self.generics(), function(item) {
            if (item && item.hash) {
                var itemFound = self.findItemByHash(item.hash, item.characterId);
                if (itemFound) {
                    itemFound.doEquip = item.doEquip;
                    itemFound.markAsEquip = self.markAsEquip;
                    _items.push(itemFound);
                }
            }
        });
        return _items.sort(function(a, b) {
            if (a.armorIndex > -1) {
                return a.armorIndex - b.armorIndex;
            } else if (a.weaponIndex > -1) {
                return a.weaponIndex - b.weaponIndex;
            } else {
                return -1;
            }
        });
    });
    this.editing = ko.observable(false);
    /*this.sortUp = function() {
        var currentIndex = app.loadouts.indexOf(self);
        var nextIndex = currentIndex - 1;
        console.log("currentIndex", currentIndex);
        console.log("nextIndex", nextIndex);
        console.log(_.map(app.loadouts(), function(loadout) {
            return loadout.name();
        }));
        //add the item to the right position in the array
        app.loadouts.splice(nextIndex, 0, self);
        //remove item from the array
        currentIndex = app.loadouts.indexOf(self);
        console.log(app.loadouts.splice(currentIndex, 1));
    }
    this.sortDown = function() {
        var currentIndex = app.loadouts.indexOf(self);
        var nextIndex = currentIndex + 1;
        console.log("currentIndex", currentIndex);
        console.log("nextIndex", nextIndex);
        console.log(_.map(app.loadouts(), function(loadout) {
            return loadout.name()
        }));
        //add the item to the right position in the array
        app.loadouts.splice(nextIndex, 0, self);
        //remove item from the array
        //currentIndex = app.loadouts.indexOf(self)+1;
        console.log(app.loadouts.splice(nextIndex + 1, 1));
    }*/
    this.rename = function() {
        self.editing(!self.editing());
    };
    this.equip = function() {
        if (confirm("Are you sure you want to close this dialog and open the Loadouts panel to equip this set?")) {
            self.setActive();
            app.manageLoadoutDialog.close();
        }
    };
    this.markAsEquip = function(item, event) {
        var existingItems = _.where(self.ids(), {
            bucketType: item.bucketType
        }).filter(function(loadoutItem) {
            var foundItem = _.find(self.items(), {
                _id: loadoutItem.id
            });
            //sometimes an item is not found due to it being deleted or reforged, at this point filter it out of the list, issue #135
            if (!foundItem) return false;

            if (item.bucketType == "Subclasses" || foundItem.armorIndex != -1) {
                return item.doEquip() === true && item._id != loadoutItem.id && item.character.classType() == foundItem.character.classType();
            }
            return item.doEquip() === true && item._id != loadoutItem.id;
        });
        /* if the item being equipped is an exotic then the other exotics become unequipped */
        if (item.tierType == 6 && item.hasLifeExotic === false && item.doEquip()) {
            _.each(self.ids(), function(equip) {
                var itemFound = self.findItemById(equip.id);
                if (itemFound && itemFound.tierType && itemFound.tierType == 6 && itemFound.hasLifeExotic === false && equip.doEquip() && equip.id != item._id && (
                        (item.weaponIndex > -1 && itemFound.weaponIndex > -1) || (item.armorIndex > -1 && itemFound.armorIndex > -1)
                    )) {
                    existingItems.push(equip);
                }
            });
        }
        if (existingItems.length > 0) {
            _.each(existingItems, function(loadoutItem) {
                loadoutItem.doEquip(false);
            });
        }
        if (item.doEquip()) {
            //TODO: TypeError: undefined is not an object (evaluating '_.findWhere(self.ids(), { id: item._id }).doEquip')
            _.findWhere(self.ids(), {
                id: item._id
            }).doEquip(true);
        }
        return true;
    };

    /* inits a Loadouts object with an Items array */
    if (isItems) {
        _.each(model, function(item) {
            if (item._id > 0) {
                self.addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                self.addGenericItem({
                    hash: item.id,
                    bucketType: item.bucketType,
                    characterId: item.characterId()
                });
            }
        });
    }
    /* loader/migrate code */
    else if (model && model.ids && model.ids.length > 0) {
        var firstItem = model.ids[0];
        if (firstItem && _.isString(firstItem)) {
            //tgd.localLog("this model needs a migration " + JSON.stringify(model));
            var _ids = [];
            _.each(model.ids, function(id) {
                var equipDef = _.findWhere(model.equipIds, {
                    _id: id
                });
                var item = self.findItemById(id);
                if (item)
                    _ids.push(new tgd.LoadoutItem({
                        id: id,
                        bucketType: equipDef ? equipDef.bucketType : item.bucketType,
                        doEquip: equipDef ? true : false
                    }));
            });
            self.ids(_ids);
        } else {
            //tgd.localLog("this model doesn't need a migration " + JSON.stringify(model));
            self.ids(_.map(model.ids, function(obj) {
                //tgd.localLog(obj);
                return new tgd.LoadoutItem(obj);
            }));
        }
    }

};

tgd.Loadout.prototype = {
    /* this function is meant to normalize the difference between having ghost/artifacts in armor and it existing under general */
    normalize: function(bucketTypes, extras) {
        var arrUnion = _.difference(extras, bucketTypes),
            arr = [];
        if (arrUnion.length == extras.length) {
            arr = _.union(bucketTypes, extras);
        } else {
            arr = _.difference(bucketTypes, extras);
        }
        return arr;
    },
    toJSON: function() {
        var copy = ko.toJS(this); //easy way to get a clean copy
        //copy.items = _.pluck(copy.items, '_id'); //strip out items metadata
        delete copy.items;
        return copy;
    },
    compareLoadout: function() {
        var ids = _.pluck(this.items(), 'id').join(",");
        window.open("http://db.destinytracker.com/compare/" + ids, tgd.openTabAs);
    },
    setActive: function() {
        app.loadoutMode(true);
        app.dynamicMode(false);
        app.activeLoadout(_.clone(this));
    },
    remove: function() {
        if (confirm("Are you sure you want to remove this loadout? This action cannot be undone")) {
            var ref = _.findWhere(app.loadouts(), {
                loadoutId: this.loadoutId
            });
            app.loadouts.remove(ref);
            app.createLoadout();
            app.saveLoadouts();
            app.loadoutMode(false);
        }
    },
    save: function() {
        //this is a reference to the cloned Loadout object while in use
        //ref is a reference to the Loadout object this came from
        //the reason for making a clone is to make sure the original isn't modified
        var ref = _.findWhere(app.loadouts(), {
            loadoutId: this.loadoutId
        });
        //When saving there should always be the parent object that gets deleted in favor of this one
        if (ref) {
            app.loadouts.splice(app.loadouts().indexOf(ref), 1);
        }
        //Pushing the reference to the new object to the array
        app.loadouts.push(this);
        app.saveLoadouts();
    },
    saveNew: function() {
        //There's no need to find a reference to the parent to delete it if this is Save as New
        app.loadouts.push(this);
        app.saveLoadouts();
    },
    addUniqueItem: function(obj) {
        this.ids.push(new tgd.LoadoutItem(obj));
    },
    addGenericItem: function(obj) {
        this.generics.push(new tgd.LoadoutItem(obj));
    },
    findItemByHash: function(hash, characterId) {
        var itemFound;
        app.characters().forEach(function(character) {
            var match = _.filter(character.items(), function(item) {
                if (characterId)
                    return item.id == hash && item.characterId() == characterId;
                else
                    return item.id == hash;
            })[0];
            if (match) itemFound = _.clone(match);
        });
        return itemFound;
    },
    findItemById: function(id) {
        var itemFound;
        app.characters().forEach(function(character) {
            var match = _.findWhere(character.items(), {
                _id: id
            });
            if (match) itemFound = _.clone(match);
        });
        return itemFound;
    },
    swapItems: function(swapArray, targetCharacterId, callback) {
        var self = this;
        tgd.autoTransferStacks = true;
        var itemIndex = -1,
            increments = parseInt(Math.round(95 / (1.0 * swapArray.length))),
            progressValue = 5;
        var loader = $(".bootstrap-dialog-message .progress").show().find(".progress-bar").width(progressValue + "%");
        var transferNextItem = function() {
            tgd.localLog("**************transferNextItem*************");
            var pair = swapArray[++itemIndex],
                targetItem, swapItem, action, targetOwner;
            progressValue = progressValue + increments;
            loader.width(progressValue + "%");
            //now that they are both in the vault transfer them to their respective location
            var transferTargetItemToVault = function(complete) {
                targetItem = pair.targetItem;
                if (typeof targetItem != "undefined") {
                    targetOwner = targetItem.character.id;
                    tgd.localLog(" transferTargetItemToVault " + targetItem.description);
                    if (targetOwner == "Vault") {
                        complete();
                    } else {
                        var originalCharacterId = targetItem.character.id;
                        targetItem.store("Vault", function(profile) {
                            if (profile.id == originalCharacterId) {
                                $.toaster({
                                    priority: 'danger',
                                    title: 'Error',
                                    message: "Unable to unequip " + targetItem.description + " while playing in game"
                                });
                                complete();
                            } else {
                                complete();
                            }
                        });
                    }
                } else {
                    complete();
                }
            };
            var transferSwapItemToVault = function(complete) {
                swapItem = pair.swapItem;
                tgd.localLog("^^^^^^^^^^" + swapItem.character.id + " transferSwapItemToVault " + swapItem.description);
                if (swapItem.character.id == "Vault") {
                    complete();
                } else {
                    var originalCharacterId = swapItem.character.id;
                    swapItem.store("Vault", function(profile) {
                        tgd.localLog(originalCharacterId + " transferSwapItemToVault result " + profile.id);
                        /* unequip failed, pick another swapItem not used in the swapArray */
                        if (profile.id == originalCharacterId) {
                            var equippedItem = swapItem;
                            tgd.localLog("^^^^^^^^^unequipped failed for " + swapItem.description);
                            tgd.localLog(swapArray);
                            var swapAndTargetIDs = _.flatten(_.map(swapArray, function(pair) {
                                var tmp = [];
                                if (pair.swapItem)
                                    tmp.push(pair.swapItem._id);
                                if (pair.targetItem)
                                    tmp.push(pair.targetItem._id);
                                return tmp;
                            }));
                            tgd.localLog("swapAndTargetIDs: " + swapAndTargetIDs);
                            tgd.localLog("targetItem character is " + targetItem.character.uniqueName());
                            var candidates = _.filter(swapItem.character.get(swapItem.bucketType), function(item) {
                                var isCandidate = swapAndTargetIDs.indexOf(item._id) == -1;
                                tgd.localLog(item.description + " is part of the swap and target ids? " + isCandidate);
                                return isCandidate;
                            });
                            tgd.localLog(candidates.length + " candidates: " + _.pluck(candidates, 'description'));
                            if (candidates.length > 0) {
                                swapItem = candidates[0];
                                tgd.localLog("candidate is " + swapItem._id + " and is currently sitting in " + swapItem.character.uniqueName());
                                swapItem.store("Vault", function() {
                                    tgd.localLog("^^^^^^^ xfered new candidate to vault");
                                    complete();
                                });
                            } else {
                                $.toaster({
                                    priority: 'danger',
                                    title: 'Error',
                                    message: "Unable to unequip " + equippedItem.description + " while playing in game"
                                });
                                pair.swapItem = pair.targetItem = targetItem = swapItem = null;
                                tgd.localLog("No candidates can't xfer targetItem");
                                complete();
                            }
                        } else {
                            complete();
                        }
                    });
                }
            };
            var transferTargetItemToDestination = function(complete) {
                if (typeof targetItem == "undefined" && pair.targetItem)
                    targetItem = pair.targetItem;
                if (targetItem) {
                    var action = (_.where(self.ids(), {
                        id: targetItem._id
                    }).filter(function(item) {
                        return item.doEquip() === true;
                    }).length === 0) ? "store" : "equip";
                    tgd.localLog(targetItem.description + " transferTargetItemToDestination " + targetCharacterId + " action: " + action);
                    if (targetCharacterId == "Vault" && targetItem.character.id == "Vault") {
                        tgd.localLog("transferTargetItemToDestination: item needs to be in Vault and is already in Vault");
                        complete();
                    } else {
                        var originalCharacterId = targetItem.character.id;
                        targetItem[action](targetCharacterId, function(profile) {
                            if (profile.id == originalCharacterId) {
                                $.toaster({
                                    priority: 'danger',
                                    title: 'Error',
                                    message: "Unable to unequip " + targetItem.description + " while playing in game"
                                });
                                complete();
                            } else {
                                complete();
                            }
                        });
                    }
                } else {
                    complete();
                }
            };
            var transferSwapItemToDestination = function(complete) {
                if (typeof swapItem == "undefined" && pair.swapItem)
                    swapItem = pair.swapItem;
                if (swapItem) {
                    tgd.localLog(targetOwner + " (targetOwner) transferSwapItemToDestination " + swapItem.description);
                    if (targetOwner == "Vault" && swapItem.character.id == "Vault") {
                        tgd.localLog("transferSwapItemToDestination: item needs to be in Vault and is already in Vault");
                        complete();
                    } else {
                        swapItem.store(targetOwner, complete);
                    }
                } else {
                    complete();
                }
            };
            /* this assumes there is a swap item and a target item*/
            var startSwapping = function(finish) {
                tgd.localLog("startSwapping ");
                transferTargetItemToVault(function() {
                    tgd.localLog("finished transferTargetItemToVault at ");
                    transferSwapItemToVault(function() {
                        tgd.localLog("finished transferSwapItemToVault at ");
                        transferTargetItemToDestination(function() {
                            tgd.localLog("finished transferTargetItemToDestination item to vault at ");
                            transferSwapItemToDestination(function() {
                                tgd.localLog("*********finished transferSwapItemToDestination swap items **************");
                                if (finish) finish();
                                else transferNextItem();
                            });
                        });
                    });
                });
            };
            /* this assumes there is a swap item and a target item*/
            var checkAndMakeFreeSpace = function(ref, spaceNeeded, fnHasFreeSpace) {
                var item = ref;
                if (typeof item == "undefined") {
                    return BootstrapDialog.alert(self.description + ": Item not found while attempting to transfer the item " + ref.description);
                } else if (ref.bucketType == "Subclasses") {
                    return fnHasFreeSpace();
                }
                var vault = _.findWhere(app.characters(), {
                    id: "Vault"
                });
                var bucketType = item.bucketType,
                    otherBucketTypes;
                var layout = _.filter(tgd.DestinyLayout, function(layout) {
                    return (layout.bucketTypes.indexOf(bucketType) > -1 && layout.extras.indexOf(bucketType) == -1) || (layout.bucketTypes.indexOf(bucketType) == -1 && layout.extras.indexOf(bucketType) > -1);
                })[0];
                var actualBucketTypes = self.normalize(layout.bucketTypes, layout.extras);
                var spaceNeededInVault = layout.counts[0] - spaceNeeded;
                //TODO: TypeError: undefined is not an object (evaluating 'vault.items')
                var spaceUsedInVault = _.filter(vault.items(), function(otherItem) {
                    return actualBucketTypes.indexOf(otherItem.bucketType) > -1;
                }).length;

                tgd.localLog(bucketType + " spaceNeededInVault: " + spaceNeededInVault);
                tgd.localLog(bucketType + " spaceUsedInVault: " + spaceUsedInVault);

                if (spaceUsedInVault <= spaceNeededInVault) { // || targetCharacterId == "Vault"
                    tgd.localLog("vault has at least 2 slots to make xfer");
                    fnHasFreeSpace();
                } else {
                    //tgd.localLog("why did i run out of space already?");
                    //abort;
                    var maxFreeSpace = 9, //not counting the equipped
                        tmpItems = [],
                        tmpIds = [];
                    var freeSpaceNeeded = spaceUsedInVault - spaceNeededInVault;
                    tgd.localLog("Vault does not have enough free space, need to temp move something from here to free up x slots: " + freeSpaceNeeded);
                    otherBucketTypes = [].concat(actualBucketTypes);
                    otherBucketTypes.splice(otherBucketTypes.indexOf(bucketType), 1);
                    tgd.localLog("other bucket types: " + otherBucketTypes);
                    tgd.localLog(otherBucketTypes + " being checked in other characters");
                    _.each(otherBucketTypes, function(bucketType) {
                        if (tgd.DestinyNonUniqueBuckets.indexOf(bucketType) == -1) {
                            _.each(app.characters(), function(character) {
                                if (freeSpaceNeeded > 0 && character.id != "Vault") {
                                    tgd.localLog("checking " + character.uniqueName() + " the " + bucketType);
                                    var freeSpace = maxFreeSpace - character.get(bucketType).length;
                                    if (freeSpace > 0) {
                                        tgd.localLog(bucketType + " found with free space: " + freeSpace);
                                        var itemsToMove = vault.get(bucketType);
                                        tgd.localLog("vault has these many of those items to move " + itemsToMove.length);
                                        _.each(itemsToMove, function(item) {
                                            if (freeSpaceNeeded > 0 && freeSpace > 0 && tmpIds.indexOf(item._id) == -1) {
                                                tmpItems.push({
                                                    item: item,
                                                    character: character
                                                });
                                                tmpIds.push(item._id);
                                                freeSpaceNeeded = freeSpaceNeeded - 1;
                                                freeSpace = freeSpace - 1;
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                    tgd.localLog("so the plan is to move these from the vault ");
                    tgd.localLog(tmpItems);
                    var preCount = 0,
                        postCount = 0;
                    var finish = function() {
                        postCount++;
                        if (postCount == tmpItems.length) {
                            tgd.localLog("********* temp items moved back, finished, transferNextItem ********* ");
                            transferNextItem();
                        }
                    };
                    var done = function() {
                        preCount++;
                        tgd.localLog("current: " + preCount + " total: " + tmpItems.length + " vault size: ");
                        if (preCount == tmpItems.length) {
                            tgd.localLog("moved temp items out, now start swap with callback ");
                            fnHasFreeSpace(function() {
                                //console.log("^^^^^^^^ fnHasFreeSpace released control moving items back");
                                _.each(tmpItems, function(pair) {
                                    pair.item.store("Vault", finish);
                                });
                            });
                        }
                    };
                    _.each(tmpItems, function(pair) {
                        pair.item.store(pair.character.id, done);
                    });
                }
            };
            if (pair) {
                if (typeof pair.swapItem !== "undefined") {
                    checkAndMakeFreeSpace(pair.swapItem, 2, startSwapping);
                } else if (typeof pair.targetItem !== "undefined") {
                    tgd.localLog("no swapItem, transferTargetItem");
                    checkAndMakeFreeSpace(pair.targetItem, 1, function(callback) {
                        transferTargetItemToDestination(function() {
                            if (callback) callback();
                            else transferNextItem();
                        });
                    });
                } else {
                    tgd.localLog("******* if pair else (no target, swap) transferNextItem**********************");
                    transferNextItem();
                }
            } else {
                tgd.localLog("pair is not defined, calling callback");
                tgd.autoTransferStacks = false;
                if (callback)
                    callback();
            }
        };
        app.activeLoadout(new tgd.Loadout());
        app.loadoutMode(false);
        transferNextItem();
    },
    /* Going to undo these changes until I can cleanup the loading code so it doesn't blip during a reload
	transfer: function(targetCharacterId){
		var self = this;		
		var subscription = app.loadingUser.subscribe(function(newValue){
			if (newValue === false){
				self.move( targetCharacterId );
				subscription.dispose();
			}
		});
		app.refresh();
	},*/
    /* before starting the transfer we need to decide what strategy we are going to use */
    /* strategy one involves simply moving the items across assuming enough space to fit in both without having to move other things */
    /* strategy two involves looking into the target bucket and creating pairs for an item that will be removed for it */
    /* strategy three is the same as strategy one except nothing will be moved bc it's already at the destination */
    transfer: function(targetCharacterId, callback) {
        var self = this;
        var targetCharacter = _.findWhere(app.characters(), {
            id: targetCharacterId
        });
        if (typeof targetCharacter == "undefined") {
            return BootstrapDialog.alert("Target character not found");
        }
        var targetCharacterIcon = targetCharacter.icon();
        var getFirstItem = function(sourceBucketIds, itemFound) {
            //tgd.localLog(itemFound + " getFirstItem: " + sourceBucketIds);
            return function(otherItem) {
                /* if the otherItem is not part of the sourceBucket then it can go */
                //tgd.localLog(otherItem.description + " is in " + sourceBucketIds);
                if (sourceBucketIds.indexOf(otherItem._id) == -1 && itemFound === false) {
                    itemFound = true;
                    sourceBucketIds.push(otherItem._id);
                    return otherItem;
                }
            };
        };
        var masterSwapArray = [],
            swapItem,
            sourceItems = self.items();
        if (sourceItems.length > 0) {
            var targetList = targetCharacter.items();
            var sourceGroups = _.groupBy(sourceItems, 'bucketType');
            var targetGroups = _.groupBy(targetList, 'bucketType');
            masterSwapArray = _.flatten(_.map(sourceGroups, function(group, key) {
                var sourceBucket = sourceGroups[key];
                var targetBucket = targetGroups[key] || [];
                var swapArray = [];
                if (sourceBucket && targetBucket) {
                    if (tgd.DestinyNonUniqueBuckets.indexOf(key) == -1) {
                        var maxBucketSize = 10;
                        var targetBucketSize = targetBucket.length;
                        if (targetCharacter.id == "Vault") {
                            var layout = _.filter(tgd.DestinyLayout, function(layout) {
                                return (layout.bucketTypes.indexOf(key) > -1 && layout.extras.indexOf(key) == -1) ||
                                    (layout.bucketTypes.indexOf(key) == -1 && layout.extras.indexOf(key) > -1);
                            })[0];
                            var actualBucketTypes = self.normalize(layout.bucketTypes, layout.extras);
                            targetBucketSize = _.filter(targetCharacter.items(), function(item) {
                                return actualBucketTypes.indexOf(item.bucketType) > -1;
                            }).length;
                            maxBucketSize = layout.counts[0];
                        }
                        //tgd.localLog("the current bucket size is " + targetBucketSize);
                        var targetMaxed = (targetBucketSize == maxBucketSize);
                        tgd.localLog(key + " bucket max of " + maxBucketSize + " : " + targetMaxed);
                        tgd.localLog("need to transfer " + sourceBucket.length + " items, the target is this full " + targetBucketSize);
                        /* use the swap item strategy */
                        /* by finding a random item in the targetBucket that isnt part of sourceBucket */
                        if (sourceBucket.length + targetBucketSize > maxBucketSize) {
                            tgd.localLog("using swap strategy");
                            var sourceBucketIds = _.pluck(sourceBucket, "_id");
                            swapArray = _.map(sourceBucket, function(item) {
                                var ownerIcon = item.character.icon();
                                /* if the item is already in the targetBucket */
                                if (_.findWhere(targetBucket, {
                                        _id: item._id
                                    })) {
                                    /* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
                                    if (item.doEquip() === true) {
                                        return {
                                            targetItem: item,
                                            description: item.description + app.activeText().loadouts_to_equip,
                                            actionIcon: "assets/to-equip.png",
                                            swapIcon: targetCharacterIcon
                                        };
                                    }
                                    /* then return an object indicating to do nothing */
                                    else {
                                        return {
                                            description: item.description + app.activeText().loadouts_alreadythere_pt1 + targetCharacter.classType() + app.activeText().loadouts_alreadythere_pt2 + item.bucketType,
                                            targetIcon: item.icon,
                                            actionIcon: "assets/no-transfer.png",
                                            swapIcon: ownerIcon
                                        };
                                    }
                                } else {
                                    var itemFound = false;
                                    if (item.bucketType == "Shader") {
                                        swapItem = _.filter(targetBucket, function(otherItem) {
                                            return otherItem.bucketType == item.bucketType && otherItem.description != "Default Shader" && sourceBucketIds.indexOf(otherItem._id) == -1;
                                        })[0];
                                    } else {
                                        /* This will ensure that an item of the same itemHash will not be used as a candidate for swapping 
												e.g. if you have a Thorn on two characters, you want to send any hand cannon between them and never swap the Thorn
											*/
                                        tgd.localLog("looking for a swap item for " + item.description);
                                        var sourceBucketHashes = _.pluck(_.where(item.character.items(), {
                                            bucketType: item.bucketType
                                        }), 'id');
                                        tgd.localLog("the owner of this swap item has these items: " + sourceBucketHashes);
                                        tgd.localLog("the target where this is going has these many items " + targetBucket.length);
                                        var candidates = _.filter(targetBucket, function(otherItem) {
                                            var index = sourceBucketHashes.indexOf(otherItem.id);
                                            tgd.localLog(index + " candidate: " + otherItem.description);
                                            return index == -1 && otherItem.transferStatus < 2; // && otherItem.isEquipped() === false
                                        });
                                        tgd.localLog("candidates: " + _.pluck(candidates, 'description'));
                                        swapItem = _.filter(_.where(candidates, {
                                            type: item.type
                                        }), getFirstItem(sourceBucketIds, itemFound));
                                        tgd.localLog("1.swapItem: " + swapItem.length);
                                        if (swapItem.length === 0) {
                                            //tgd.localLog("candidates: " + _.pluck(candidates, 'description'));
                                            tgd.localLog(targetBucket);
                                        }
                                        swapItem = (swapItem.length > 0) ? swapItem[0] : _.filter(candidates, getFirstItem(sourceBucketIds, itemFound))[0];
                                        /* if there is still no swapItem at this point I have to break the original rule the prevents duplicates*/
                                        if (!swapItem) {
                                            swapItem = _.filter(targetBucket, getFirstItem(sourceBucketIds, itemFound))[0];
                                        }
                                    }
                                    if (swapItem) {
                                        tgd.localLog("2.swapItem: " + swapItem.description);
                                        targetBucket.splice(targetBucket.indexOf(swapItem), 1);
                                        //tgd.localLog("eliminating " + swapItem.description + " from the targetBuckets list " + _.pluck(targetBucket,'description'));
                                        if (swapItem.armorIndex != -1 && item.character.id != "Vault" && item.character.classType() != targetCharacter.classType()) {
                                            return {
                                                description: item.description + app.activeText().loadouts_no_transfer,
                                                targetIcon: item.icon,
                                                actionIcon: "assets/no-transfer.png",
                                                swapIcon: ownerIcon
                                            };
                                        }
                                        return {
                                            targetItem: item,
                                            swapItem: swapItem,
                                            description: item.description + app.activeText().loadouts_swap + swapItem.description,
                                            actionIcon: "assets/swap.png"
                                        };
                                    } else {
                                        tgd.localLog("to transfer: " + item.description);
                                        return {
                                            targetItem: item,
                                            description: item.description + app.activeText().loadouts_to_transfer,
                                            swapIcon: targetCharacterIcon,
                                            actionIcon: "assets/to-transfer.png"
                                        };
                                    }
                                }
                            });
                        } else {
                            /* do a clean move by returning a swap object without a swapItem */
                            swapArray = _.map(sourceBucket, function(item) {
                                var ownerIcon = item.character.icon();
                                /* if the item is already in the targetBucket */
                                if (_.findWhere(targetBucket, {
                                        _id: item._id
                                    })) {
                                    /* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
                                    tgd.localLog(item.description + " item is already in target bucket, doEquip? " + item.doEquip());
                                    if (item.doEquip() === true) {
                                        return {
                                            targetItem: item,
                                            description: item.description + app.activeText().loadouts_to_equip,
                                            actionIcon: "assets/to-equip.png",
                                            swapIcon: targetCharacterIcon
                                        };
                                    }
                                    /* then return an object indicating to do nothing */
                                    else {
                                        return {
                                            description: item.description + app.activeText().loadouts_alreadythere_pt1 + targetCharacter.classType() + app.activeText().loadouts_alreadythere_pt2 + item.bucketType,
                                            targetIcon: item.icon,
                                            actionIcon: "assets/no-transfer.png",
                                            swapIcon: ownerIcon
                                        };
                                    }
                                }
                                //this condition is supposed to supress subclases 
                                else if (item.bucketType == "Subclasses") {
                                    tgd.localLog(item.description + " wont transfer sub classes ");
                                    return {
                                        description: item.description + app.activeText().loadouts_no_transfer,
                                        targetIcon: item.icon,
                                        actionIcon: "assets/no-transfer.png",
                                        swapIcon: ownerIcon
                                    };
                                } else {
                                    if (item.doEquip() === true) {
                                        return {
                                            targetItem: item,
                                            description: item.description + app.activeText().loadouts_to_moveequip,
                                            actionIcon: "assets/to-equip.png",
                                            swapIcon: targetCharacterIcon
                                        };
                                    } else {
                                        tgd.localLog("loadouts_to_transfer: " + item.description);
                                        return {
                                            targetItem: item,
                                            description: item.description + app.activeText().loadouts_to_transfer,
                                            actionIcon: "assets/to-transfer.png",
                                            swapIcon: targetCharacterIcon
                                        };
                                    }
                                }
                            });
                        }
                    } else {
                        swapArray = _.map(sourceBucket, function(item) {
                            return {
                                targetItem: item,
                                description: item.description + app.activeText().loadouts_to_transfer,
                                actionIcon: "assets/to-transfer.png",
                                swapIcon: targetCharacterIcon
                            };
                        });
                    }
                }
                return swapArray;
            }));
        }
        if (callback) {
            if (_.isFunction(callback)) callback(masterSwapArray);
            else return masterSwapArray;
        } else {
            self.promptUserConfirm(masterSwapArray, targetCharacterId);
        }
    },
    generateTemplate: function(masterSwapArray, targetCharacterId, indexes) {
        var self = this;
        var html = $(tgd.swapTemplate({
            swapArray: masterSwapArray
        }) + $(".progress").find(".progress-bar").width(0).end().clone().wrap('<div>').parent().show().html());
        var targetCharacter = _.findWhere(app.characters(), {
            id: targetCharacterId
        });
        var swapIds = _.pluck(_.pluck(masterSwapArray, 'swapItem'), '_id');
        html.find(".item").click(false);
        html.find(".swapItem").click(function() {
            var instanceId = $(this).attr("instanceid");
            var item = self.findItemById(instanceId);
            /* When a swap item is clicked a few steps must be performed:
            	-determine bucket type
            	-determine items in that bucket
            	-exclude items already in masterSwapArray
            	-if the array is not empty then switch to the first item
            	-maintain the index so we can cycle through the whole list
            	-provide error message regarding no candidates if array is empty
            */
            if (item) {
                var items = targetCharacter.get(item.bucketType);
                var candidates = _.filter(items, function(candidate) {
                    return swapIds.indexOf(candidate._id) == -1 && candidate.transferStatus < 2;
                });
                if (candidates.length > 0) {
                    _.each(masterSwapArray, function(pair) {
                        if (pair && pair.swapItem && pair.swapItem._id == instanceId) {
                            var targetId = pair.targetItem._id;
                            if (targetId in indexes && (indexes[targetId] + 1 < candidates.length)) {
                                indexes[targetId]++;
                            } else {
                                indexes[targetId] = 0;
                            }
                            //console.log(_.pluck(candidates,'description'));
                            //console.log(indexes[targetId] + " replacing " + pair.swapItem.description + " with " + candidates[indexes[targetId]].description);
                            pair.swapItem = candidates[indexes[targetId]];
                        }
                    });
                    self.loadoutsDialog.content(self.generateTemplate(masterSwapArray, targetCharacterId, indexes));
                }
            }
        });
        return html;
    },
    promptUserConfirm: function(masterSwapArray, targetCharacterId, callback) {
        if (masterSwapArray.length > 0) {
            var self = this;
            self.indexes = {};
            var $template = self.generateTemplate(masterSwapArray, targetCharacterId, self.indexes);
            var transfer = function(dialog) {
                self.swapItems(masterSwapArray, targetCharacterId, function() {
                    $.toaster({
                        settings: {
                            timeout: 15 * 1000
                        },
                        priority: 'success',
                        title: 'Success',
                        message: app.activeText().loadouts_transferred
                    });
                    setTimeout(function() {
                        $(".donateLink").click(app.showDonate);
                    }, 1000);
                    app.dynamicMode(false);
                    dialog.close();
                    if (callback) {
                        var targetCharacter = _.findWhere(app.characters(), {
                            id: targetCharacterId
                        });
                        callback(targetCharacter);
                    }
                });
            };
            self.loadoutsDialog = (new tgd.dialog({
                buttons: [{
                    label: app.activeText().loadouts_transfer,
                    action: function(dialog) {
                        transfer(dialog);
                    }
                }, {
                    label: app.activeText().cancel,
                    action: function(dialog) {
                        dialog.close();
                    }
                }]
            })).title(app.activeText().loadouts_transfer_confirm).content($template).show(true,
                function() { //onHide
                    $(document).unbind("keyup.dialog");
                },
                function() { //onShown
                    //to prevent multiple binding
                    $(document).unbind("keyup.dialog").bind("keyup.dialog", function(e) {
                        var code = e.which;
                        if (code == 13) {
                            transfer(self.loadoutsDialog.modal);
                            $(document).unbind("keyup.dialog");
                        }
                    });
                });
        }
    }
};