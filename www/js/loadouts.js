	var LoadoutItem = function(model) {
	    var self = this;

	    _.each(model, function(value, key) {
	        self[key] = value;
	    });
	    var _doEquip = (model && model.hash) ? ((self.doEquip && self.doEquip.toString() == "true") || false) : false;
	    this.doEquip = ko.observable(_doEquip);
	}

	var Loadout = function(model) {
	    var self = this;

	    _.each(model, function(value, key) {
	        self[key] = value;
	    });
	    this.name = self.name || "";
	    this.ids = ko.observableArray();
	    this.generics = ko.observableArray();
	    this.items = ko.computed(function() {
	        var _items = [];
	        _.each(self.ids(), function(equip) {
	            if (equip) {
	                var itemFound = self.findItemById(equip.id);
	                if (itemFound) {
	                    itemFound.doEquip = equip.doEquip;
	                    itemFound.markAsEquip = self.markAsEquip;
	                    _items.push(itemFound);
	                } else {
	                    self.ids.remove(equip);
	                }
	            }
	        });
	        _.each(self.generics(), function(item) {
	            if (item && item.hash) {
	                var itemFound = self.findItemByHash(item.hash);
	                if (itemFound) {
	                    itemFound.doEquip = item.doEquip;
	                    itemFound.markAsEquip = self.markAsEquip;
	                    _items.push(itemFound);
	                } else {
	                    self.generics.remove(item);
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
	                return item.doEquip() == true && item._id != loadoutItem.id && item.character.classType == foundItem.character.classType;
	            }
	            return item.doEquip() == true && item._id != loadoutItem.id;
	        });
	        /* if the item being equipped is an exotic then the other exotics become unequipped */
	        if (item.tierType == 6 && item.doEquip()) {
	            _.each(self.ids(), function(equip) {
	                var itemFound = self.findItemById(equip.id);
	                if (itemFound && itemFound.tierType && itemFound.tierType == 6 && equip.doEquip() && equip.id != item._id && (
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
	            _.findWhere(self.ids(), {
	                id: item._id
	            }).doEquip(true);
	        }
	        return true;
	    }

	    /* loader/migrate code */
	    if (model && model.ids && model.ids.length > 0) {
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
	                    _ids.push(new LoadoutItem({
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
	                return new LoadoutItem(obj);
	            }));
	        }
	    }

	}

	Loadout.prototype = {
	    toJSON: function() {
	        var copy = ko.toJS(this); //easy way to get a clean copy
	        //copy.items = _.pluck(copy.items, '_id'); //strip out items metadata
	        delete copy.items;
	        return copy;
	    },
	    setActive: function() {
	        app.loadoutMode(true);
	        app.dynamicMode(false);
	        app.activeLoadout(this);
	    },
	    remove: function() {
	        app.loadouts.remove(this);
	        app.createLoadout();
	        app.saveLoadouts();
	    },
	    save: function() {
	        var ref = _.findWhere(app.loadouts(), {
	            name: this.name
	        });
	        if (ref) {
	            app.loadouts.splice(app.loadouts().indexOf(ref), 1);
	        }
	        app.loadouts.push(this);
	        app.saveLoadouts();
	    },
	    addUniqueItem: function(obj) {
	        this.ids.push(new LoadoutItem(obj));
	    },
	    addGenericItem: function(obj) {
	        this.generics.push(new LoadoutItem(obj));
	    },
	    findItemByHash: function(hash) {
	        var itemFound;
	        app.characters().forEach(function(character) {
	            var match = _.findWhere(character.items(), {
	                id: hash
	            });
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
	    /* the object with the .store function has to be the one in app.characters not this copy */
	    findReference: function(item) {
	        if (item && item.character && item.character.id) {
	            var c = _.findWhere(app.characters(), {
	                id: item.character.id
	            });
	            //tgd.localLog("querying with character id " + item.character.id);
	            //tgd.localLog(c.uniqueName);
	            //TODO need to add a way to catch c being null to prevent a crash, and need to avoid it all together if possible
				if (c && c.items){
					var query = item._id == 0 ? {
						id: item.id
					} : {
						_id: item._id
					};
					//tgd.localLog("querying with " + JSON.stringify(query));
					var x = _.findWhere(c.items(), query);
					//tgd.localLog(x);
					return x;
				} else {
					return null;
				}
	        } else {
	            return null;
	        }
	    },
	    swapItems: function(swapArray, targetCharacterId, callback) {
	        var self = this;
	        var onlyEquipped = function(item) {
	            return item.doEquip() == true;
	        }
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
	                targetItem = self.findReference(pair.targetItem);
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
	                                    title: 'Error:',
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
	            }
	            var transferSwapItemToVault = function(complete) {
	                swapItem = self.findReference(pair.swapItem);
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
	                                    tmp.push(pair.swapItem._id)
	                                if (pair.targetItem)
	                                    tmp.push(pair.targetItem._id)
	                                return tmp;
	                            }));
	                            tgd.localLog("swapAndTargetIDs: " + swapAndTargetIDs);
	                            tgd.localLog("targetItem character is " + targetItem.character.uniqueName);
	                            var candidates = _.filter(swapItem.character.get(swapItem.bucketType), function(item) {
	                                var isCandidate = swapAndTargetIDs.indexOf(item._id) == -1;
	                                tgd.localLog(item.description + " is part of the swap and target ids? " + isCandidate);
	                                return isCandidate;
	                            });
	                            tgd.localLog(candidates.length + " candidates: " + _.pluck(candidates, 'description'));
	                            if (candidates.length > 0) {
	                                swapItem = candidates[0];
	                                tgd.localLog("candidate is " + swapItem._id + " and is currently sitting in " + swapItem.character.uniqueName);
	                                swapItem.store("Vault", function() {
	                                    tgd.localLog("^^^^^^^ xfered new candidate to vault");
	                                    complete();
	                                });
	                            } else {
	                                $.toaster({
	                                    priority: 'danger',
	                                    title: 'Error:',
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
	            }
	            var transferTargetItemToDestination = function(complete) {
	                if (typeof targetItem == "undefined" && pair.targetItem)
	                    targetItem = self.findReference(pair.targetItem);
	                if (targetItem) {
	                    var action = (_.where(self.ids(), {
	                        id: targetItem._id
	                    }).filter(onlyEquipped).length == 0) ? "store" : "equip";
	                    tgd.localLog(targetItem.description + " transferTargetItemToDestination " + targetCharacterId);
	                    if (targetCharacterId == "Vault" && targetItem.character.id == "Vault") {
	                        tgd.localLog("transferTargetItemToDestination: item needs to be in Vault and is already in Vault");
	                        complete();
	                    } else {
	                        var originalCharacterId = targetItem.character.id;
	                        targetItem[action](targetCharacterId, function(profile) {
	                            if (profile.id == originalCharacterId) {
	                                $.toaster({
	                                    priority: 'danger',
	                                    title: 'Error:',
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
	            }
	            var transferSwapItemToDestination = function(complete) {
	                    if (typeof swapItem == "undefined" && pair.swapItem)
	                        swapItem = self.findReference(pair.swapItem);
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
	                }
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
	                }
	                /* this assumes there is a swap item and a target item*/
	            var checkAndMakeFreeSpace = function(ref, spaceNeeded, fnHasFreeSpace) {
	                var item = self.findReference(ref);
	                if (typeof item == "undefined") {
	                    return BootstrapDialog.alert("Item not found while attempting to transfer the item");
	                }
	                var vault = _.findWhere(app.characters(), {
	                    id: "Vault"
	                });
	                var bucketType = item.bucketType,
	                    otherBucketTypes;
	                var layout = _.filter(tgd.DestinyLayout, function(layout) {
	                    return layout.bucketTypes.indexOf(bucketType) > -1
	                })[0];
	                var spaceNeededInVault = layout.counts[0] - spaceNeeded;
	                var spaceUsedInVault = _.filter(vault.items(), function(item) {
	                    return layout.bucketTypes.indexOf(bucketType) > -1;
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
	                    otherBucketTypes = [].concat(layout.bucketTypes);
	                    otherBucketTypes.splice(otherBucketTypes.indexOf(bucketType), 1);
	                    tgd.localLog("other bucket types: " + otherBucketTypes);
	                    tgd.localLog(otherBucketTypes + " being checked in other characters");
	                    _.each(otherBucketTypes, function(bucketType) {
	                        if (tgd.DestinyNonUniqueBuckets.indexOf(bucketType) == -1) {
	                            _.each(app.characters(), function(character) {
	                                if (freeSpaceNeeded > 0 && character.id != "Vault") {
	                                    tgd.localLog("checking " + character.uniqueName);
	                                    var freeSpace = maxFreeSpace - character.get(bucketType).length;
	                                    if (freeSpace > 0) {
	                                        tgd.localLog(bucketType + " found with free space: " + freeSpace);
	                                        var itemsToMove = vault.get(bucketType);
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
	                    }
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
	                    }
	                    _.each(tmpItems, function(pair) {
	                        pair.item.store(pair.character.id, done);
	                    });
	                }

	            }
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
	                if (callback)
	                    callback();
	            }
	        }
	        app.activeLoadout(new Loadout());
	        app.loadoutMode(false);
	        transferNextItem();
	    },
	    /* Going to undo these changes until I can cleanup the loading code so it doesn't blip during a reload
	transfer: function(targetCharacterId){
		var self = this;		
		var subscription = app.loadingUser.subscribe(function(newValue){
			if (newValue == false){
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
	        var targetCharacterIcon = targetCharacter.icon().replace('url("', '').replace('")', '');
	        var getFirstItem = function(sourceBucketIds, itemFound) {
	            //tgd.localLog(itemFound + " getFirstItem: " + sourceBucketIds);
	            return function(otherItem) {
	                /* if the otherItem is not part of the sourceBucket then it can go */
	                //tgd.localLog(otherItem.description + " is in " + sourceBucketIds);
	                if (sourceBucketIds.indexOf(otherItem._id) == -1 && itemFound == false) {
	                    itemFound = true;
	                    sourceBucketIds.push(otherItem._id);
	                    return otherItem;
	                }
	            }
	        };
	        var masterSwapArray = [],
	            sourceItems = self.items();
	        if (sourceItems.length > 0) {
	            var targetList = targetCharacter.items();
	            var sourceGroups = _.groupBy(sourceItems, 'bucketType');
	            var targetGroups = _.groupBy(targetList, 'bucketType');
	            var masterSwapArray = _.flatten(_.map(sourceGroups, function(group, key) {
	                var sourceBucket = sourceGroups[key];
	                var targetBucket = targetGroups[key];
	                var swapArray = [];
	                if (sourceBucket && targetBucket) {
	                    if (tgd.DestinyNonUniqueBuckets.indexOf(key) == -1) {
	                        var maxBucketSize = 10;
	                        var targetBucketSize = targetBucket.length;
	                        if (targetCharacter.id == "Vault") {
	                            targetBucketSize = _.where(targetCharacter.items(), {
	                                bucketType: key
	                            }).length;
	                            maxBucketSize = _.filter(tgd.DestinyLayout, function(layout) {
	                                return layout.bucketTypes.indexOf(key) > -1
	                            })[0].counts[0];
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
	                                var ownerIcon = item.character.icon().replace('url("', '').replace('")', '');
	                                /* if the item is already in the targetBucket */
	                                if (_.findWhere(targetBucket, {
	                                        _id: item._id
	                                    })) {
	                                    /* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
	                                    if (item.doEquip() == true) {
	                                        return {
	                                            targetItem: item,
	                                            description: item.description + app.activeText().loadouts_to_equip,
	                                            actionIcon: "assets/to-equip.png",
	                                            swapIcon: targetCharacterIcon
	                                        }
	                                    }
	                                    /* then return an object indicating to do nothing */
	                                    else {
	                                        return {
	                                            description: item.description + app.activeText().loadouts_alreadythere_pt1 + targetCharacter.classType + app.activeText().loadouts_alreadythere_pt2 + item.bucketType,
	                                            targetIcon: item.icon,
	                                            actionIcon: "assets/no-transfer.png",
	                                            swapIcon: ownerIcon
	                                        }
	                                    }
	                                } else {
	                                    var itemFound = false;
	                                    if (item.bucketType == "Shader") {
	                                        var swapItem = _.filter(targetBucket, function(otherItem) {
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
	                                            return index == -1 && otherItem.transferStatus < 2; // && otherItem.isEquipped() == false
	                                        });
	                                        tgd.localLog("candidates: " + _.pluck(candidates, 'description'));
	                                        var swapItem = _.filter(_.where(candidates, {
	                                            type: item.type
	                                        }), getFirstItem(sourceBucketIds, itemFound));
	                                        tgd.localLog("1.swapItem: " + swapItem.length);
	                                        if (swapItem.length == 0) {
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
	                                        if (swapItem.armorIndex != -1 && item.character.classType != targetCharacter.classType) {
	                                            return {
	                                                description: item.description + app.activeText().loadouts_no_transfer,
	                                                targetIcon: item.icon,
	                                                actionIcon: "assets/no-transfer.png",
	                                                swapIcon: ownerIcon
	                                            }
	                                        }
	                                        return {
	                                            targetItem: item,
	                                            swapItem: swapItem,
	                                            description: item.description + app.activeText().loadouts_swap + swapItem.description,
	                                            actionIcon: "assets/swap.png"
	                                        }
	                                    } else {
	                                        tgd.localLog("to transfer: " + item.description);
	                                        return {
	                                            targetItem: item,
	                                            description: item.description + app.activeText().loadouts_to_transfer,
	                                            swapIcon: targetCharacterIcon,
	                                            actionIcon: "assets/to-transfer.png"
	                                        }
	                                    }
	                                }
	                            });
	                        } else {
	                            /* do a clean move by returning a swap object without a swapItem */
	                            swapArray = _.map(sourceBucket, function(item) {
	                                var ownerIcon = item.character.icon().replace('url("', '').replace('")', '');
	                                /* if the item is already in the targetBucket */
	                                if (_.findWhere(targetBucket, {
	                                        _id: item._id
	                                    })) {
	                                    /* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
	                                    if (item.doEquip() == true) {
	                                        return {
	                                            targetItem: item,
	                                            description: item.description + app.activeText().loadouts_to_equip,
	                                            actionIcon: "assets/to-equip.png",
	                                            swapIcon: targetCharacterIcon
	                                        }
	                                    }
	                                    /* then return an object indicating to do nothing */
	                                    else {
	                                        return {
	                                            description: item.description + app.activeText().loadouts_alreadythere_pt1 + targetCharacter.classType + app.activeText().loadouts_alreadythere_pt2 + item.bucketType,
	                                            targetIcon: item.icon,
	                                            actionIcon: "assets/no-transfer.png",
	                                            swapIcon: ownerIcon
	                                        }
	                                    }
	                                } else if (item.bucketType == "Subclasses" || (item.armorIndex != -1 && item.character.classType != targetCharacter.classType)) {
	                                    return {
	                                        description: item.description + app.activeText().loadouts_no_transfer,
	                                        targetIcon: item.icon,
	                                        actionIcon: "assets/no-transfer.png",
	                                        swapIcon: ownerIcon
	                                    }
	                                } else {
	                                    if (item.doEquip() == true) {
	                                        return {
	                                            targetItem: item,
	                                            description: item.description + app.activeText().loadouts_to_moveequip,
	                                            actionIcon: "assets/to-equip.png",
	                                            swapIcon: targetCharacterIcon
	                                        }
	                                    } else {
	                                        tgd.localLog("loadouts_to_transfer: " + item.description);
	                                        return {
	                                            targetItem: item,
	                                            description: item.description + app.activeText().loadouts_to_transfer,
	                                            actionIcon: "assets/to-transfer.png",
	                                            swapIcon: targetCharacterIcon
	                                        }
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
	                            }
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
	                    return swapIds.indexOf(candidate._id) == -1 && candidate.transferStatus < 2
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
	                } else {
	                    BootstrapDialog.alert("No swap candidates available");
	                }
	            }
	        });
	        return html;
	    },
	    promptUserConfirm: function(masterSwapArray, targetCharacterId) {
	        if (masterSwapArray.length > 0) {
	            var self = this;
	            self.indexes = {};
	            var $template = self.generateTemplate(masterSwapArray, targetCharacterId, self.indexes);
	            self.loadoutsDialog = (new tgd.dialog({
	                buttons: [{
	                    label: app.activeText().loadouts_transfer,
	                    action: function(dialog) {
	                        var ats = app.autoTransferStacks();
	                        app.autoTransferStacks(true);
	                        self.swapItems(masterSwapArray, targetCharacterId, function() {
	                            tgd.localLog("swapItems finished");
	                            app.autoTransferStacks(ats);
	                            $.toaster({
	                                settings: {
	                                    timeout: 15 * 1000
	                                }
	                            });
	                            $.toaster({
	                                priority: 'success',
	                                title: 'Success:',
	                                message: app.activeText().loadouts_transferred
	                            });
	                            $.toaster.reset();
	                            setTimeout(function() {
	                                $(".donateLink").click(app.showDonate);
	                            }, 1000);
	                            app.dynamicMode(false);
	                            dialog.close()
	                        });
	                    }
	                }, {
	                    label: app.activeText().cancel,
	                    action: function(dialog) {
	                        dialog.close()
	                    }
	                }]
	            })).title(app.activeText().loadouts_transfer_confirm).content($template).show(true);
	        }
	    }
	}