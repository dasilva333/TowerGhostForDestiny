define(['knockout', "underscore", "jquery"], function(ko, _, $){

	var Item = function(model, profile) {
		var self = this;
		_.each(model, function(value, key) {
			self[key] = value;
		});
		this.character = profile;
		this.href = "https://destinydb.com/items/" + self.id;
		this.isEquipped = ko.observable(self.isEquipped);
		this.primaryStat = self.primaryStat || "";
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
			return true;
			var $parent = app,
				self = this;
			var searchFilter = $parent.searchKeyword() == '' || self.hasPerkSearch($parent.searchKeyword()) ||
				($parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) > -1);
			var dmgFilter = $parent.dmgFilter().length == 0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
			var setFilter = $parent.setFilter().length == 0 || $parent.setFilter().indexOf(self.id) > -1;
			var tierFilter = $parent.tierFilter() == 0 || $parent.tierFilter() == self.tierType;
			var progressFilter = $parent.progressFilter() == 0 || self.hashProgress($parent.progressFilter());
			var typeFilter = $parent.typeFilter() == 0 || $parent.typeFilter() == self.type;
			var dupes = _.filter(tgd.duplicates(), function(id) {
				return id == self.id
			}).length;
			var showDuplicate = $parent.showDuplicate() == false || ($parent.showDuplicate() == true && dupes > 1);
			/*console.log( "searchFilter: " + searchFilter);
			console.log( "dmgFilter: " + dmgFilter);
			console.log( "setFilter: " + setFilter);
			console.log( "tierFilter: " + tierFilter);
			console.log( "progressFilter: " + progressFilter);
			console.log( "typeFilter: " + typeFilter);
			console.log("keyword is: " + $parent.searchKeyword());
			console.log("keyword is empty " + ($parent.searchKeyword() == ''));
			console.log("keyword has perk " + self.hasPerkSearch($parent.searchKeyword()));
			console.log("perks are " + JSON.stringify(self.perks));
			console.log("description is " + self.description);
			console.log("keyword has description " + ($parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) >-1));*/
			return (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (typeFilter) && (showDuplicate);
		},
		/* helper function that unequips the current item in favor of anything else */
		unequip: function(callback, allowReplacement, excludeExotic) {
			var self = this;
			//console.log('trying to unequip too!');
			if (self.isEquipped() == true) {
				//console.log("and its actually equipped");
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
							//console.log(item.description);
							/* still haven't found a match */
							if (otherEquipped == false) {
								if (item != self && item.equip) {
									//console.log("trying to equip " + item.description);
									item.equip(self.characterId, function(isEquipped) {
										//console.log( item.description + " result was " + isEquipped);
										if (isEquipped == true) {
											otherEquipped = true;
											callback(true);
										} else {
											tryNextItem(); /*console.log("tryNextItem")*/
										}
									});
								} else {
									tryNextItem()
										//console.log("tryNextItem")
								}
							}
						}
						//console.log("tryNextItem")
						//console.log("trying to unequip item, the min tier of the items I can equip is: " + minTier);
					if (minTier == 6) {
						var otherItemUnequipped = false;
						var otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
						otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
						_.each(otherBucketTypes, function(bucketType) {
							var itemEquipped = self.character.itemEquipped(bucketType);
							if (itemEquipped && itemEquipped.tierType && itemEquipped.tierType == 6) {
								//console.log("going to unequip " + itemEquipped.description);
								itemEquipped.unequip(function(result) {
									//unequip was successful
									if (result) {
										tryNextItem();
									}
									//unequip failed
									else {
										BootstrapDialog.alert(app.activeText().unable_unequip + itemEquipped.description);
										callback(false);
									}
								}, false, true);
								otherItemUnequipped = true;
							}
						});
						if (!otherItemUnequipped) {
							//console.log("no other exotic equipped, safe to equip");
							tryNextItem();
						}
					} else {
						tryNextItem();
					}
				} else if (allowReplacement) {
					//console.log("unequip allows replacement");
					var otherItems = _.filter(_.where(self.character.items(), {
						bucketType: self.bucketType
					}), function(item) {
						return item._id !== self._id;
					});
					if (otherItems.length > 0) {
						//console.log('found an item an item to equip instead ' + otherItems[0].description);
						otherItems[0].equip(self.character.id, function() {
							console.log("finished equipping other item");
							callback(true);
						}, true);
					} else {
						console.log("no item to replace it");
						callback(false);
					}
				} else {
					//console.log("refused to unequip");
					callback(false);
				}
			} else {
				//console.log("but not equipped");
				callback(true);
			}
		},
		equip: function(targetCharacterId, callback, allowReplacement) {
			var self = this;
			var done = function() {
				//console.log("making bungie call to equip " + self.description);
				app.bungie.equip(targetCharacterId, self._id, function(e, result) {
					if (result && result.Message && result.Message == "Ok") {
						//console.log("result was OKed");
						//console.log(result);
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
						//console.log("result failed");
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
			//console.log("equip called from " + sourceCharacterId + " to " + targetCharacterId);
			if (targetCharacterId == sourceCharacterId) {
				//console.log("item is already in the character");
				/* if item is exotic */
				if (self.tierType == 6 && allowReplacement) {
					//console.log("item is exotic");
					var otherExoticFound = false,
						otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
					otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
					//console.log("the other bucket types are " + JSON.stringify(otherBucketTypes));
					_.each(otherBucketTypes, function(bucketType) {
						var otherExotic = _.filter(_.where(self.character.items(), {
							bucketType: bucketType,
							tierType: 6
						}), function(item) {
							return item.isEquipped();
						});
						//console.log( "otherExotic: " + JSON.stringify(_.pluck(otherExotic,'description')) );
						if (otherExotic.length > 0) {
							//console.log("found another exotic equipped " + otherExotic[0].description);
							otherExoticFound = true;
							otherExotic[0].unequip(done, allowReplacement);
						}
					});
					if (otherExoticFound == false) {
						done();
					}
				} else {
					//console.log("request is not part of a loadout");
					done()
				}
			} else {
				//console.log("item is NOT already in the character");
				self.store(targetCharacterId, function(newProfile) {
					//console.log("item is now in the target destination");
					self.character = newProfile;
					self.characterId = newProfile.id;
					self.equip(targetCharacterId, callback, allowReplacement);
				}, allowReplacement);
			}
		},
		transfer: function(sourceCharacterId, targetCharacterId, amount, cb) {
			//console.log("Item.transfer");
			//console.log(arguments);
			var self = this,
				x, y, characters = app.characters();
			if (characters.length == 0) {
				/*ga('send', 'exception', {
					'exDescription': "No characters found to transfer with " + JSON.stringify(app.activeUser()),
					'exFatal': false,
					'appVersion': tgd.version,
					'hitCallback': function() {
						console.log("crash reported");
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
						console.log("crash reported");
					}
				});*/
				app.refresh();
				return BootstrapDialog.alert("Error has occured, please report this issue to my Github. Target character not found " + targetCharacterId);
			}
			//console.log( self.description );
			app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result) {
				//console.log("app.bungie.transfer after");
				//console.log(arguments);
				if (result && result.Message && result.Message == "Ok") {
					if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
						//console.log("need to split reference of self and push it into x and y");
						var remainder = self.primaryStat - amount;
						/* at this point we can either add the item to the inventory or merge it with existing items there */
						var existingItem = _.findWhere(y.items(), {
							description: self.description
						});
						if (existingItem) {
							y.items.remove(existingItem);
							existingItem.primaryStat = existingItem.primaryStat + amount;
							y.items.push(existingItem);
						} else {
							self.characterId = targetCharacterId
							self.character = y;
							self.primaryStat = amount;
							y.items.push(self);
						}
						/* the source item gets removed from the array, change the stack size, and add it back to the array if theres items left behind */
						x.items.remove(self);
						if (remainder > 0) {
							self.characterId = sourceCharacterId
							self.character = x;
							self.primaryStat = remainder;
							x.items.push(self);
						}
					} else {
						self.characterId = targetCharacterId
						self.character = y;
						y.items.push(self);
						x.items.remove(self);
					}
					if (cb) cb(y, x);
				} else {
					if (result && result.Message) {
						BootstrapDialog.alert(result.Message);
					} else {

					}
				}
			});
		},
		store: function(targetCharacterId, callback, allowReplacement) {
			//console.log("item.store");
			//console.log(arguments);
			var self = this;
			var sourceCharacterId = self.characterId,
				transferAmount = 1;
			var done = function() {
				if (targetCharacterId == "Vault") {
					//console.log("from character to vault " + self.description);
					self.unequip(function(result) {
						//console.log("calling transfer from character to vault");
						if (result)
							self.transfer(sourceCharacterId, "Vault", transferAmount, callback);
						if (result == false && callback)
							callback(self.character);
					}, allowReplacement);
				} else if (sourceCharacterId !== "Vault") {
					//console.log("from character to vault to character " + self.description);				
					self.unequip(function(result) {
						if (result) {
							if (self.bucketType == "Subclasses") {
								if (callback)
									callback(self.character);
							} else {
								//console.log("xfering item to Vault " + self.description);
								self.transfer(sourceCharacterId, "Vault", transferAmount, function() {
									//console.log("xfered item to vault and now to " + targetCharacterId);
									self.transfer("Vault", targetCharacterId, transferAmount, callback);
								});
							}
						}
						if (result == false && callback)
							callback(self.character);
					}, allowReplacement);
				} else {
					//console.log("from vault to character");
					self.transfer("Vault", targetCharacterId, transferAmount, callback);
				}
			}
			if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
				if (self.primaryStat == 1) {
					done();
				} else if (app.autoTransferStacks() == true) {
					transferAmount = self.primaryStat;
					done();
				} else {
					var dialogItself = (new tgd.dialog({
							message: function() {
								var itemTotal = 0;
								for (i = 0; i < app.orderedCharacters().length; i++) {
									var c = app.orderedCharacters()[i];
									var characterTotal = _.reduce(
										_.filter(c.items(), {
											description: self.description
										}),
										function(memo, j) {
											return memo + j.primaryStat;
										},
										0);
									itemTotal = itemTotal + characterTotal;
								}
								var $content = $(
									'<div><div class="controls controls-row">' + app.activeText().transfer_amount + ': ' +
									'<button type="button" class="btn btn-default" id="dec">  -  </button>' +
									' <input type="text" id="materialsAmount" value="' + self.primaryStat + '" size="4"> ' +
									'<button type="button" class="btn btn-default" id="inc">  +  </button>' +
									'<button type="button" class="btn btn-default pull-right" id="all"> ' + app.activeText().transfer_all + ' (' + self.primaryStat + ') </button>' +
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
										$("input#materialsAmount").val(Math.min(num + 1, self.primaryStat));
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
										$("input#materialsAmount").val(self.primaryStat);
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
								if (!isNaN(transferAmount)) {
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
				done();
			}
		},
		normalize: function(characters) {
			app.normalizeSingle(this.description, characters, false, undefined);
		},
		consolidate: function(targetCharacterId, description) {
			//console.log(targetCharacterId);
			//console.log(description);

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
					//console.log("all items consolidated");
					if (callback !== undefined) {
						callback();
					}
					return;
				}

				//console.log("xfer " + theStack.primaryStat + " from: " + theStack.character.id + ", to: " + targetCharacterId);

				if (targetCharacterId == "Vault") {
					theStack.transfer(theStack.character.id, "Vault", theStack.primaryStat, function() {
						nextTransfer(callback);
					});
				} else if (theStack.character.id == "Vault") {
					theStack.transfer("Vault", targetCharacterId, theStack.primaryStat, function() {
						nextTransfer(callback);
					});
				} else {
					theStack.transfer(theStack.character.id, "Vault", theStack.primaryStat, function() {
						theStack.transfer("Vault", targetCharacterId, theStack.primaryStat, function() {
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
										return memo + i.primaryStat;
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
	return Item;
});	