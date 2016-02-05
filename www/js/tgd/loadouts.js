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
	};
	
	tgd.Loadout.prototype = {
		_items: function(){
			var self = this;
			var _items = _.sortBy(self.uniques().concat(self.generics()), function(item){
				return [ item.armorIndex, item.weaponIndex ];
			});
			return _items;
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
		