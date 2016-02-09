	tgd.loadoutId = 0;

	tgd.LoadoutItem = function(model, loadout) {
	    var item = this;

	    _.each(model, function(value, key) {
	        item[key] = value;
	    });
		
		var _doEquip = (model && typeof model.hash == "undefined") ? ((item.doEquip && item.doEquip.toString() == "true") || false) : false;
		this.doEquip = ko.observable(_doEquip);
		this.loadout = loadout;
		
		if (item && item.hash) {
			var itemFound = item.findItemByHash(item.hash, item.characterId);
			if (itemFound) {
				$.extend(item, itemFound);
			}
		}
		else if (item && item.itemInstanceId){
			var itemFound = item.findItemById(item.itemInstanceId);
			if (itemFound) {
				$.extend(item, itemFound);
			}
		}
	};
	
	tgd.LoadoutItem.prototype = {
		markAsEquip: function(item, event){
			var self = this;
			
			//Find existing items within the same bucket type, except for itself to mark as unequipped
	        var existingItems = _.filter(self.loadout.uniques(), function(otherItem){
				return otherItem.bucketType == item.bucketType && otherItem.itemInstanceId != item.itemInstanceId;
	        });
	        /* if the item being equipped is an exotic then find the other exotics to become unequipped */
	        if (item.tierType == 6 && item.hasLifeExotic === false && item.doEquip()) {
	            existingItems = _.reduce(self.loadout.uniques(), function(memo, itemFound) {
	                if (itemFound && itemFound.tierType && itemFound.tierType == 6 && itemFound.hasLifeExotic === false && itemFound.doEquip() && itemFound.instanceId != itemFound.instanceId && (
	                        (item.weaponIndex > -1 && itemFound.weaponIndex > -1) || (item.armorIndex > -1 && itemFound.armorIndex > -1)
	                    )) {
	                    memo.push(itemFound);
	                }
	            }, existingItems);
	        }
			//All the existingItems collected will now be marked as unequipped
	        _.each(existingItems, function(loadoutItem) {
				loadoutItem.doEquip(false);
			});
			
	        item.doEquip(true);
			return true;
		},
		findItemByHash: function(hash, characterId) {
	        return _.reduce( app.characters(), function(memo, character) {
	            var match = _.filter(character.items(), function(item) {
	                if (characterId)
	                    return item.id == hash && item.characterId() == characterId;
	                else
	                    return item.id == hash;
	            });
	            if (match.length > 0) memo = match[0];
				return memo;
	        });
	    },
	    findItemById: function(id) {
	        return _.reduce( app.characters(), function(memo, character) {
	            var match = _.findWhere(character.items(), {
	                _id: id
	            });
	            if (match) memo = match;
				return memo;
	        });
	    },
	}
	
	tgd.Loadout = function(params) {
	    var self = this;
		
		this.loadoutId = tgd.loadoutId++;
		this.uniques = ko.observableArray();
		this.generics = ko.observableArray();
		this.items = ko.computed(this._items, this);
		this.options = {
			keepOpenSlots: false,
			transferLockedItems: true,
			transferTaggedItems: true,
			transferClassItems: false
		}
	};
	
	tgd.Loadout.prototype = {
		_items: function(){
			var self = this;
			var _items = _.sortBy(self.uniques().concat(self.generics()), function(item){
				return [ item.armorIndex, item.weaponIndex ];
			});
			return _items;
		},
		createTransferPlan: function(targetCharacterId){
			var self = this;
			var targetCharacter = _.findWhere(app.characters(), {
	            id: targetCharacterId
	        });
	        if (typeof targetCharacter == "undefined") {
	            return BootstrapDialog.alert("Target character not found");
	        }
			var targetCharacterItems = targetCharacter.items();
			var targetCharacterIcon = targetCharacter.icon();
			var loadoutItems = self.items();
			var loadoutGroups = _.groupBy(loadoutItems, 'bucketType');
			//Remap loadoutItems to an array of what the transfer plan is going to be
			var masterSwapArray = _.reduce(loadoutItems, function(memo, item){
				var transferPlan = {};
				/* step 1: determine the bucket and section it will be moved to */
				var bucketType = item.bucketType, section = item.actualBucketType;
				
				/* step 2: determine the sizes of the destination blocks */
				var targetBucketSize = _.where( targetCharacterItems, { bucketType: bucketType }).length;
				
				var targetSectionSize = _.where( targetCharacterItems, { actualBucketType: section }).length;
				
				console.log("targetBucketSize",targetBucketSize,"targetSectionSize",targetSectionSize);
				
				/* step 3: determine the max size of the destination */
				var maxBucketSize;
				if ( targetCharacterId == "Vault" ){
					maxBucketSize = _.findWhere(tgd.DestinyLayout, { array: section }).counts[0];
				}
				else {
					if (tgd.DestinyNonUniqueBuckets.indexOf(bucketType) == -1) {
						maxBucketSize = 10;
					}
					/* materials and consumables use their own sizes*/
					else {
						maxBucketSize = 20;
					}
				}
				
				/* step 4: determine if the item can fit in the destination */
				var targetIsFull = (loadoutGroups[bucketType].length + targetBucketSize) > maxBucketSize;
				
				/* can't fit all the items in the loadout into the destination */
				if (targetIsFull) {
					//TODO: Come up with a safe and reliable way to get a unique swap candidate for each item
					var swapItem = item;
					transferPlan = {
						targetItem: item,
						swapItem: swapItem,
						description: item.description + app.activeText().loadouts_swap + swapItem.description,
						actionIcon: "assets/swap.png"
					};
				}
				/* at this point all the items selected fit neatly into the destination */
				else {
					/*
					1) there is 3 open slots, and 3 items that need to be xfered in, and keepOpenSlots=false. result: to-transfer 3 items
					2) there is 3 open slots, and 3 items that need to be xfered in, and keepOpenSlots=true. result: swap 3 items
					3) there is 3 open slots, and 4 items that need to be xfered in, and keepOpenSlots=true. result: swap 4 items
					4) there is 3 open slots, and 8 items that need to be xfered in, and keepOpenSlots=true. result: swap 8 items, ignore open slots request
					5) there is 1 open slot, and 3 items that need to be xfered in, and keepOpenSlots=true. result: swap 3 items 
					6) there is 1 open slot, and 3 items that need to be xfered in, and keepOpenSlots=false. result: swap 2 items, xfer 1 item
					*/
					transferPlan = {
						targetItem: item,
						description: item.description + app.activeText().loadouts_to_transfer,
						swapIcon: targetCharacterIcon,
						actionIcon: "assets/to-transfer.png"
					};
				}
				
				memo.push(transferPlan);
				
				return memo;
			}, []);
			
			return masterSwapArray;
		},
		transfer: function(targetCharacterId, callback) {
			var self = this;
			
			var masterSwapArray = self.createTransferPlan(targetCharacterId);
			
			console.log(masterSwapArray);
			
			if (callback) {
	            if (_.isFunction(callback)){
					callback(masterSwapArray);
				}
	            else {
					return masterSwapArray;
				}
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
	                            pair.swapItem = candidates[indexes[targetId]];
	                        }
	                    });
	                    self.loadoutsDialog.content(self.generateTemplate(masterSwapArray, targetCharacterId, indexes));
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
	    },
	    addUniqueItem: function(obj) {
	        this.uniques.push(new tgd.LoadoutItem(obj, this));
	    },
	    addGenericItem: function(obj) {
	        this.generics.push(new tgd.LoadoutItem(obj, this));
	    },
	    toJSON: function() {
	        var copy = ko.toJS(this); //easy way to get a clean copy
	        delete copy.items;
	        return copy;
	    },
		
		
	    remove: function() {
	        var ref = _.findWhere(app.loadouts(), {
	            loadoutId: this.loadoutId
	        });
	        app.loadouts.remove(ref);
	        app.createLoadout();
	        app.saveLoadouts();
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
	}
	

	tgd.Loadouts = function(){
		
		this.saveLoadouts = function(includeMessage) {
			var _includeMessage = _.isUndefined(includeMessage) ? true : includeMessage;
			if (self.activeUser() && self.activeUser().user && self.activeUser().user.membershipId) {
				var params = {
					action: "save",
					membershipId: parseFloat(self.activeUser().user.membershipId),
					loadouts: ko.toJSON(self.loadouts())
				};
				self.apiRequest(params, function(results) {
					if (_includeMessage === true) {
						if (results.success) {
							$.toaster({
								priority: 'success',
								title: 'Saved',
								message: "Loadouts saved to the cloud",
								settings: {
									timeout: tgd.defaults.toastTimeout
								}
							});
						} else BootstrapDialog.alert("Error has occurred saving loadouts");
					}
				});
			} else {
				BootstrapDialog.alert("Error reading your membershipId, could not save loadouts");
			}
		};

		this.loadLoadouts = function() {
			if (self.loadouts().length === 0) {
				var _loadouts = window.localStorage.getItem("loadouts");
				if (!_.isEmpty(_loadouts)) {
					_loadouts = _.map(JSON.parse(_loadouts), function(loadout) {
						return new tgd.Loadout(loadout);
					});
				} else {
					_loadouts = [];
				}
				var maxCSP = "";
				try {
					maxCSP = _.map(
						_.groupBy(
							_.sortBy(
								_.filter(
									_.flatten(
										_.map(self.characters(), function(character) {
											return character.items();
										})
									),
									function(item) {
										return item.armorIndex > -1;
									}), 'bucketType'), 'bucketType'),
						function(items, bucketType) {
							return String.fromCharCode(_.max(_.map(items, function(item) {
								return item.getValue("All");
							})));
						}).join("");
				} catch (e) {

				}
				self.apiRequest({
					action: "load",
					//this ID is shared between PSN/XBL so a better ID is one that applies only to one profile
					membershipId: parseFloat(self.activeUser().user.membershipId),
					//Crowd Sourced values for maxCSP
					maxCSP: maxCSP
						/*this one applies only to your current profile
					accountId: self.bungie.getMemberId()*/
				}, function(results) {
					var _results = [];
					if (results && results.loadouts) {
						_results = _.isArray(results.loadouts) ? results.loadouts : [results.loadouts];
						_results = _.map(_results, function(loadout) {
							loadout.ids = _.isArray(loadout.ids) ? loadout.ids : [loadout.ids];
							loadout.equipIds = _.isEmpty(loadout.equipIds) ? [] : loadout.equipIds;
							loadout.equipIds = _.isArray(loadout.equipIds) ? loadout.equipIds : [loadout.equipIds];
							return new tgd.Loadout(loadout);
						});
					}
					/* one time migrate joins the two arrays and clears the local one */
					if (_loadouts.length > 0) {
						_results = _loadouts.concat(_results);
						window.localStorage.setItem("loadouts", "");
					}
					self.loadouts(_results);
					/* one time migrate saves the new joined array to the cloud */
					if (_loadouts.length > 0) {
						self.saveLoadouts(false);
					}
					/*if (results && results.itemDefs) {
						tgd.localLog("downloading locale update");
						self.downloadLocale(self.currentLocale(), results.itemDefs.version);
					}*/
				});
			}
		};
	}
		