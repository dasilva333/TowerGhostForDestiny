window.tgd = {
	duplicates: ko.observableArray()
};

window.ua = navigator.userAgent;
window.isChrome = (typeof chrome !== "undefined");
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.supportsCloudSaves = window.isChrome || window.isMobile;

tgd.dialog = (function(options){
	var self = this;

	this.modal;

	this.title = function(title){
		self.modal = new BootstrapDialog(options);
        self.modal.setTitle(title);
		return self;
	}

	this.content = function(content){
		self.modal.setMessage(content);
		return self;
	}

	this.buttons = function(buttons){
		self.modal.setClosable(true).enableButtons(true).setData("buttons", buttons);
		return self;
	}

	this.show = function(excludeClick, cb){
		self.modal.open();
		var mdl = self.modal.getModal();
		if (!excludeClick){
			mdl.bind("click", function(){
				self.modal.close();
			});
		}
		mdl.on("hide.bs.modal", cb);
		return self;
	}

	return self.modal;
});

var Profile = function(model){
	var self = this;
	_.each(model, function(value, key){
		self[key] = value;
	});

	this.icon = ko.observable(self.icon);
	this.background = ko.observable(self.background);
	this.items = ko.observableArray([]);
	this.uniqueName = self.level + " " + self.race + " " + self.gender + " " + self.classType;
	this.classLetter = self.classType[0].toUpperCase();
	this.weapons = ko.computed(this._weapons, this);
	this.armor = ko.computed(this._armor, this);
	this.general = ko.computed(this._general, this);
	this.postmaster = ko.computed(this._postmaster, this);
	this.container = ko.observable();
}

Profile.prototype = {
	_weapons: function(){
		return _.filter(this.items(), function(item){
			if (item.weaponIndex > -1 )
				return item;
		});
	},
	_armor: function(){
		return _.filter(this.items(), function(item){
			if (item.armorIndex > -1 )
				return item;
		});
	},
	_general: function(){
		return _.filter(this.items(), function(item){
			if (item.armorIndex == -1 && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Subclasses")
				return item;
		});
	},
	_postmaster: function(){
		return _.filter(this.items(), function(item){
			if (item.bucketType == "Post Master")
				return item;
		});
	},
	filterItemByType: function(type, isEquipped){
		return function(item){
			return (item.bucketType == type && item.isEquipped() == isEquipped);
		}
	},
	get: function(type){
		return this.items().filter(this.filterItemByType(type, false));
	},
	itemEquipped: function(type){
		return ko.utils.arrayFirst(this.items(), this.filterItemByType(type, true));
	}
}

var Item = function(model, profile){
	var self = this;
	_.each(model, function(value, key){
		self[key] = value;
	});
	this.character = profile;
	this.href = "https://destinydb.com/items/" + self.id;
	this.isEquipped = ko.observable(self.isEquipped);
	this.primaryStat = self.primaryStat || "";
	this.isVisible = ko.computed(this._isVisible, this);
	this.isEquippable = function(avatarId){
		return ko.computed(function(){
				//rules for how subclasses can be equipped
			  var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
				//if it's in this character and it's equippable
			 return (!self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass) ||
			 	//if it's in another character and it's equippable
			 	(self.characterId != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass);
		});
	}
	this.isStoreable = function(avatarId){
		return ko.computed(function(){
			return (self.characterId != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses') ||
				(self.isEquipped() && self.character.id == avatarId);
		});
	}
}

Item.prototype = {
	hasPerkSearch: function(search){
		var foundPerk = false, self = this;
		if (self.perks){
			var vSearch = search.toLowerCase();
			self.perks.forEach(function(perk){
				if (perk.name.toLowerCase().indexOf(vSearch) > -1 || perk.description.toLowerCase().indexOf(vSearch) > -1)
					foundPerk = true;
			});
		}
		return foundPerk;
	},
	hashProgress: function(state){
		var self = this;
		if (typeof self.progression !== "undefined"){
			/* Missing XP */
			if (state == 1 && self.progression == false){
				return true;
			}
			/* Full XP  but not maxed out */
			else if (state == 2 && self.progression == true && self.isGridComplete == false){
				return true
			}
			/* Maxed weapons (Gold Borders only) */
			else if (state == 3 && self.progression == true && self.isGridComplete == true){
				return true;
			}
			else {
				return false;
			}
		}
		else {
			return false;
		}
	},
	_isVisible: function(){
		var $parent = app, self = this;
		var searchFilter = $parent.searchKeyword() == '' || self.hasPerkSearch($parent.searchKeyword()) ||
			($parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) >-1);
		var dmgFilter = $parent.dmgFilter().length ==0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
		var setFilter = $parent.setFilter().length == 0 || $parent.setFilter().indexOf(self.id) > -1 || $parent.setFilterFix().indexOf(self.id) > -1;
		var tierFilter = $parent.tierFilter() == 0 || $parent.tierFilter() == self.tierType;
		var progressFilter = $parent.progressFilter() == 0 || self.hashProgress($parent.progressFilter());
		var typeFilter = $parent.typeFilter() == 0 || $parent.typeFilter() == self.type;
		var dupes = _.filter( tgd.duplicates(), function(id){  return id == self.id } ).length;
		var showDuplicate = $parent.showDuplicate() == false ||  ($parent.showDuplicate() == true && dupes > 1);
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
	unequip: function(callback, allowReplacement, excludeExotic){
		var self = this;
		//console.log('trying to unequip too!');
		if (self.isEquipped() == true){
			//console.log("and its actually equipped");
			var otherEquipped = false, itemIndex = -1;
			var otherItems = _.filter(_.where( self.character.items(), { bucketType: self.bucketType }), function(item){
				return item.type > 0 && item._id !== self._id && (!excludeExotic || excludeExotic && item.tierType !== 6);
			});
			//console.log("other items " + otherItems.length);
			if ( otherItems.length > 0){
				/* if the only remainings item are exotic ensure the other buckets dont have an exotic equipped */
				var minTier = _.min(_.pluck( otherItems, 'tierType' ));				
				var tryNextItem = function(){
					var item = otherItems[++itemIndex];
					//console.log(item.description);
					/* still haven't found a match */
					if (otherEquipped == false){
						if (item != self){
							//console.log("trying to equip " + item.description);
							item.equip(self.characterId, function(isEquipped){
								//console.log( item.description + " result was " + isEquipped);
								if (isEquipped == true){ otherEquipped = true; callback(true); }
								else { tryNextItem(); /*console.log("tryNextItem")*/ }
							});
						}
						else {
							tryNextItem()
							//console.log("tryNextItem")
						}
					}
				}
				//console.log("tryNextItem")
				//console.log("trying to unequip item, the min tier of the items I can equip is: " + minTier);
				if (minTier == 6){
					var otherItemUnequipped = false;
					var otherBucketTypes = self.weaponIndex > -1 ? _.clone(DestinyWeaponPieces) :  _.clone(DestinyArmorPieces);
					otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex,1);
					_.each(otherBucketTypes, function(bucketType){
						var itemEquipped = self.character.itemEquipped(bucketType);
						if ( itemEquipped.tierType == 6 ){
							//console.log("going to unequip " + itemEquipped.description);
							itemEquipped.unequip(function(result){
								//unequip was successful
								if ( result ){ tryNextItem(); }
								//unequip failed
								else { 
									BootstrapDialog.alert("Unable to unequip " + itemEquipped.description); 
									callback(false); 
								}
							}, false, true);
							otherItemUnequipped = true;
						}
					});
					if (!otherItemUnequipped){
						//console.log("no other exotic equipped, safe to equip");
						tryNextItem();
					}
				}
				else {
					tryNextItem();
				}
			}
			else if (allowReplacement){
				//console.log("unequip allows replacement");
				var otherItems = _.filter(_.where( self.character.items(), { bucketType: self.bucketType }), function(item){
					return item._id !== self._id;
				});
				if (otherItems.length > 0){
					//console.log('found an item an item to equip instead ' + otherItems[0].description);
					otherItems[0].equip(self.character.id, function(){
						console.log("finished equipping other item");
						callback(true);
					}, true);
				}
				else {
					console.log("no item to replace it");
					callback(false);
				}
			}
			else {
				//console.log("refused to unequip");
				callback(false);
			}
		}
		else {
			//console.log("but not equipped");
			callback(true);
		}
	},
	equip: function(targetCharacterId, callback, allowReplacement){
		var self = this;
		var done = function(){
			//console.log("making bungie call to equip " + self.description);
			app.bungie.equip(targetCharacterId, self._id, function(e, result){
				if (result.Message == "Ok"){
					//console.log("result was OKed");
					//console.log(result);
					self.isEquipped(true);
					self.character.items().forEach(function(item){
						if (item != self && item.bucketType == self.bucketType){
							item.isEquipped(false);
						}
					});
					if (self.bucketType == "Emblem"){
						self.character.icon(app.makeBackgroundUrl(self.icon, true));
						self.character.background(self.backgroundPath);
					}
					if (callback) callback(true);
				}
				else {
					//console.log("result failed");
					/* this is by design if the user equips something they couldn't the app shouldn't assume a replacement unless it's via loadouts */
					if (callback) callback(false);
					else BootstrapDialog.alert(result.Message);
				}
			});
		}
		var sourceCharacterId = self.characterId;
		//console.log("equip called from " + sourceCharacterId + " to " + targetCharacterId);
		if (targetCharacterId == sourceCharacterId){
			//console.log("item is already in the character");
			/* if item is exotic */
			if ( self.tierType == 6 && allowReplacement){
				//console.log("item is exotic");
				var otherExoticFound = false,
					otherBucketTypes = self.weaponIndex > -1 ? _.clone(DestinyWeaponPieces) :  _.clone(DestinyArmorPieces);
				otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex,1);
				//console.log("the other bucket types are " + JSON.stringify(otherBucketTypes));
				_.each(otherBucketTypes, function(bucketType){
					var otherExotic = _.filter(_.where( self.character.items(), { bucketType: bucketType, tierType: 6 }), function(item){
						return item.isEquipped();
					});
					//console.log( "otherExotic: " + JSON.stringify(_.pluck(otherExotic,'description')) );
					if ( otherExotic.length > 0 ){
						//console.log("found another exotic equipped " + otherExotic[0].description);
						otherExoticFound = true;
						otherExotic[0].unequip(done,allowReplacement);
					}
				});
				if (otherExoticFound == false){
					done();
				}
			}
			else {
				//console.log("request is not part of a loadout");
				done()
			}
		}
		else {
			//console.log("item is NOT already in the character");
			self.store(targetCharacterId, function(newProfile){
				//console.log("item is now in the target destination");
				self.character = newProfile;
				self.characterId = newProfile.id;
				self.equip(targetCharacterId, callback, allowReplacement);
			}, allowReplacement);
		}
	},
	transfer: function(sourceCharacterId, targetCharacterId, amount, cb){
		//console.log("Item.transfer");
		//console.log(arguments);
		//setTimeout(function(){
		var self = this;
			var isVault = targetCharacterId == "Vault";
			app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result){
				//console.log("app.bungie.transfer after");
				//console.log(arguments);
				if (result.Message == "Ok"){
					var x,y;
					_.each(app.characters(), function(character){
						if (character.id == sourceCharacterId){
							//console.log("removing reference of myself ( " + self.description + " ) in " + character.classType + " from the list of " + self.list);
							x = character;
						}
						else if (character.id == targetCharacterId){
							//console.log("adding a reference of myself ( " + self.description + " ) to this guy " + character.classType);
							y = character;
						}
					});
					if (self.bucketType == "Materials" || self.bucketType == "Consumables"){
						//console.log("need to split reference of self and push it into x and y");
						var remainder = self.primaryStat - amount;
						/* at this point we can either add the item to the inventory or merge it with existing items there */
						var existingItem = _.findWhere( y.items(), { description: self.description });
						if (existingItem){
							y.items.remove(existingItem);
							existingItem.primaryStat = existingItem.primaryStat + amount;
							y.items.push(existingItem);
						}
						else {
							self.characterId = targetCharacterId
							self.character = y;
							self.primaryStat = amount;
							y.items.push(self);
						}
						/* the source item gets removed from the array, change the stack size, and add it back to the array if theres items left behind */
						x.items.remove(self);
						if (remainder > 0){
							self.characterId = sourceCharacterId
							self.character = x;
							self.primaryStat = remainder;
							x.items.push(self);
						}
					}
					else {
						self.characterId = targetCharacterId
						self.character = y;
						y.items.push(self);
						x.items.remove(self);
					}
					if (cb) cb(y,x);
				}
				else {
					BootstrapDialog.alert(result.Message);
				}
			});
		//}, 1000);
	},
	store: function(targetCharacterId, callback, allowReplacement){
		//console.log("item.store");
		//console.log(arguments);
		var self = this;
		var sourceCharacterId = self.characterId, transferAmount = 1;
		var done = function(){
			if (targetCharacterId == "Vault"){
				//console.log("from character to vault " + self.description);
				self.unequip(function(result){
					//console.log("calling transfer from character to vault");
					if (result)
						self.transfer(sourceCharacterId, "Vault", transferAmount, callback);
					if (result == false && callback)
						callback(self.character);
				}, allowReplacement);
			}
			else if (sourceCharacterId !== "Vault"){
				//console.log("from character to vault to character " + self.description);
				self.unequip(function(result){
					if (result){
						if ( self.bucketType == "Subclasses" ){
							if (callback)
								callback(self.character);
						}
						else {
							//console.log("xfering item to Vault " + self.description);
							self.transfer(sourceCharacterId, "Vault", transferAmount, function(){
								//console.log("xfered item to vault and now to " + targetCharacterId);
								self.transfer("Vault", targetCharacterId, transferAmount, callback);
							});
						}
					}
					if (result == false && callback)
						callback(self.character);
				}, allowReplacement);
			}
			else {
				//console.log("from vault to character");
				self.transfer("Vault", targetCharacterId, transferAmount, callback);
			}
		}
		if (self.bucketType == "Materials" || self.bucketType == "Consumables"){
			if (self.primaryStat == 1){
				done();
			}
			else if (app.autoTransferStacks() == true){
				transferAmount = self.primaryStat;
				done();
			}
			else {
				var dialogItself = (new tgd.dialog({
		            message: "<div>Transfer Amount: <input type='text' id='materialsAmount' value='" + self.primaryStat + "'></div>",
		            buttons: [
						{
		                	label: 'Transfer',
							cssClass: 'btn-primary',
							action: function(){
								finishTransfer()
							}
		            	},
						{
			                label: 'Close',
			                action: function(dialogItself){
			                    dialogItself.close();
			                }
		            	}
		            ]
		        })).title("Transfer Materials").show(true),
				finishTransfer = function(){
					transferAmount = parseInt($("input#materialsAmount").val());
					if (!isNaN(transferAmount)){ done(); dialogItself.modal.close(); }
					else { BootstrapDialog.alert("Invalid amount entered: " + transferAmount); }
				}
				setTimeout(function(){ $("#materialsAmount").select().bind("keyup", function(e){ if(e.keyCode == 13) { finishTransfer() } }) }, 500);
			}
		}
		else {
			done();
		}
	},
	normalize: function(){
		var self = this;
		
		var itemTotal = 0;
		var onlyCharacters = _.reject(app.characters(), function(c){ return c.id == "Vault" });
		
		/* association of character, amounts to increment/decrement */
		var characterStatus = _.map(onlyCharacters, function(c){
			var characterTotal = _.reduce(
				_.filter(c.items(), { description: self.description}),
				function(memo, i){ return memo + i.primaryStat; },
				0);
			itemTotal = itemTotal + characterTotal;
			return {character: c, current: characterTotal, needed: 0};
		});
		
		var itemSplit = (itemTotal / characterStatus.length) | 0; /* round down */
		if (itemSplit < 3){ return BootstrapDialog.alert("Cannot distribute " + itemTotal + " \"" + self.description + "\" between " + characterStatus.length + " characters."); }
		//console.log("Each character needs " + itemSplit + " " + self.description);
		
		/* calculate how much to increment/decrement each character */
		_.each(characterStatus, function(c){ c.needed = itemSplit - c.current; });
		//console.log(characterStatus);	
		
		var getNextSurplusCharacter = (function(){
			return function(){ return _.filter(characterStatus, function(c){ return c.needed < 0; })[0] };
		})();
		
		var getNextShortageCharacter = (function(){
			return function(){ return _.filter(characterStatus, function(c){ return c.needed > 0; })[0]; };
		})();		
		
		/* bail early conditions */
		if ((getNextSurplusCharacter() == undefined) || (getNextShortageCharacter() == undefined)){
			return BootstrapDialog.alert(self.description + " already normalized as best as possible.");
		}
		
		var adjustStateAfterTransfer = function(surplusCharacter, shortageCharacter, amountTransferred){
			surplusCharacter.current = surplusCharacter.current - amountTransferred;
			surplusCharacter.needed = surplusCharacter.needed + amountTransferred;
			//console.log("[Surplus (" + surplusCharacter.character.classType + ")] current: " + surplusCharacter.current + ", needed: " + surplusCharacter.needed);

			shortageCharacter.needed = shortageCharacter.needed - amountTransferred;
			shortageCharacter.current = shortageCharacter.current + amountTransferred;
			//console.log("[Shortage (" + shortageCharacter.character.classType + ")] current: " + shortageCharacter.current + ", needed: " + shortageCharacter.needed);
		};
		
		var nextTransfer = function(){
			var surplusCharacter = getNextSurplusCharacter();
			var shortageCharacter = getNextShortageCharacter();
			
			if ((surplusCharacter == undefined) || (shortageCharacter == undefined)){
				app.refresh()
				BootstrapDialog.alert("All items normalized as best as possible");
				return;
			}
			if (surplusCharacter.character.id == shortageCharacter.character.id){
				//console.log("surplusCharacter is shortageCharacter!?");
				return;
			}
			/* all the surplus characters' items that match the description. might be multiple stacks. */
			var surplusItems = _.filter(surplusCharacter.character.items(), { description: self.description});			
			var surplusItem = surplusItems[0];
			
			var maxWeCanWorkWith = Math.min(surplusItem.primaryStat, (surplusCharacter.needed * -1));			
			var amountToTransfer = Math.min(maxWeCanWorkWith, shortageCharacter.needed);
			
			//console.log("Attempting to transfer " + self.description + " (" + amountToTransfer + ") from " +
						//surplusCharacter.character.id + " (" + surplusCharacter.character.classType + ") to " +
						//shortageCharacter.character.id + " (" + shortageCharacter.character.classType + ")");

			surplusItem.transfer(surplusCharacter.character.id, "Vault", amountToTransfer, function(){
				surplusItem.transfer("Vault", shortageCharacter.character.id, amountToTransfer, function(){
					adjustStateAfterTransfer(surplusCharacter, shortageCharacter, amountToTransfer);
					nextTransfer();
				});
			});
		}
		
		var messageStr = "<div><div>Normalize " + self.description + "</div><ul>";
		for (i = 0; i < characterStatus.length; i++){
			messageStr = messageStr.concat("<li>" + characterStatus[i].character.classType + ": " +
											(characterStatus[i].needed > 0 ? "+" : "") +
											characterStatus[i].needed + "</li>");
		}		
		messageStr = messageStr.concat("</ul></div>");
		
		var dialogItself = (new tgd.dialog({
			message: messageStr,			
			buttons: [
				{
					label: 'Normalize',
					cssClass: 'btn-primary',
					action: function(){	nextTransfer() }
				},
				{
					label: 'Close',
					action: function(dialogItself){ dialogItself.close(); }
				}
			]
		})).title("Normalize Materials/Consumables").show();
	},
	extrasGlue: function(){
		var self = this;
		
		var extrasStr = "<div><ul>";
			extrasStr = extrasStr.concat("<li>Normalize - equally distribute item across your characters</li>");
			// any future stuff here
			extrasStr = extrasStr.concat("</ul></div>");
		
		var dialogItself = (new tgd.dialog({
			message: extrasStr,
			buttons: [
				{
					label: 'Normalize',
					cssClass: 'btn-primary',
					action: function(){ self.normalize(); }
				},
				{
					label: 'Close',
					action: function(dialogItself){ dialogItself.close(); }
				}
			]
		})).title("Extras for " + self.description).show();
	}
}

var activeElement;
var moveItemPositionHandler = function(element, item){
	app.activeItem(item);
	if (app.destinyDbMode() == true){
		window.open(item.href,"_system");
		return false;
	}
	else if (app.loadoutMode() == true){
		var existingItem = _.findWhere( app.activeLoadout().ids(), { id: item._id } );
		if ( existingItem )
			app.activeLoadout().ids.remove(existingItem);
		else {
			if (item._id == 0){
				BootstrapDialog.alert("Currently unable to create loadouts with this item type.");
			}
			else if ( _.where( app.activeLoadout().items(), { bucketType: item.bucketType }).length < 9){
				app.activeLoadout().addItem({ id: item._id, bucketType: item.bucketType, doEquip: false });
			}
			else {
				BootstrapDialog.alert("You cannot create a loadout with more than 9 items in the " + item.bucketType + " slots");
			}
		}
	}
	else {
		var $movePopup = $( "#move-popup" );
		if (item.bucketType == "Post Master"){
			return BootstrapDialog.alert("Post Master items cannot be transferred with the API.");
		}
		if (element	== activeElement){
			$movePopup.hide();
			activeElement = null;
		}
		else {
			activeElement = element;
			$ZamTooltips.hide();
			if (window.isMobile){
				$("body").css("padding-bottom", $movePopup.height() + "px");
				/* removing the delay and adding padding-bottom need to retest issue #12 (bottom row item) */
				$movePopup.show();
			}
			else {
				$movePopup.removeClass("navbar navbar-default navbar-fixed-bottom").addClass("desktop").show().position({
					my: "left bottom",
					at: "left top",
					collision: "none",
					of: element,
					using: function(pos, ui){
						var obj = $(this);
						setTimeout(function(){
							var box = $(ui.element.element).find(".move-popup").width();
							if (box + pos.left > ui.element.width){
								pos.left = pos.left - box;
							}
							obj.css(pos);
						},10);
					}
				});
			}
		}
	}
}

window.ko.bindingHandlers.scrollToView = {
	init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
		Hammer(element, { time: 2000 })
			.on("tap", function(){
				var index = $(".profile#" + viewModel.id).index(".profile"),
					distance = $(".profile:eq(" + index + ")").position().top - 50;
				app.scrollTo( distance );
			})
			.on("press",function(){

				BootstrapDialog.alert("This icon is " + viewModel.uniqueName);
			});
		app.quickIconHighlighter();
	}
};

window.ko.bindingHandlers.fastclick = {
	init: function(element, valueAccessor) {
		FastClick.attach(element);
		return ko.bindingHandlers.click.init.apply(this, arguments);
	}
};

getEventDelegate = function (target, selector) {
 var delegate;
 while (target && target != this.el) {
	delegate = $(target).filter(selector)[0];
	if (delegate) {
	   return delegate;
	}
	target = target.parentNode;
 }
 return undefined;
}


ko.bindingHandlers.moveItem = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
		Hammer(element, { time: 2000 })		
			.on("tap", function(ev){
				var target = getEventDelegate(ev.target, ".itemLink");
			    if (target) {
					var item = ko.contextFor(target).$data;
				    moveItemPositionHandler(target, item);
			    }
			})
			// press is actually hold 
			.on("press", function(ev){
				var target = getEventDelegate(ev.target, ".itemLink");
			    if (target) {
					var item = ko.contextFor(target).$data;
					if (app.loadoutMode() == true){
						item.doEquip(!item.doEquip());
						item.markAsEquip( item , { target: target });
					}
					else {
						$ZamTooltips.lastElement = element;
						$ZamTooltips.show("destinydb","items",item.id, element);
					}
			    }
			});
    }
};

var perksTemplate = _.template('<div class="destt-talent">' +
	'<% perks.forEach(function(perk){ %>' +
		'<div class="destt-talent-wrapper">' +
			'<div class="destt-talent-icon">' +
				'<img src="<%= perk.iconPath %>" width="36">' +
			'</div>' +
			'<div class="destt-talent-description">' +
				'<%= perk.description %>' +
			'</div>' +
		'</div>' +
	'<% }) %>' +
'</div>');

var User = function(model){
	var self = this;
	_.each(model, function(value, key){
		self[key] = value;
	});
	//try loading the Playstation account first
	this.activeSystem = ko.observable(self.psnId ? "PSN" : "XBL" );
}

var app = new (function() {
	var self = this;

	var dataDir = "data";
	var defaults = {
		searchKeyword: "",
		doRefresh: isMobile ? false : true,
		refreshSeconds: 300,
		tierFilter: 0,
		typeFilter: 0,
		dmgFilter: [],
		activeView: 0,
		progressFilter: 0,
		showDuplicate: false,
		setFilter: [],
		shareView: false,
		shareUrl: "",
		showMissing: false,
		tooltipsEnabled: isMobile ? false : true,
		autoTransferStacks: false,
		padBucketHeight: false
	};

	var getValue = function(key){
		var saved = "";
		if (window.localStorage && window.localStorage.getItem)
			saved = window.localStorage.getItem(key);
		if (_.isEmpty(saved)){
			return defaults[key];
		}
		else {
			return saved
		}
	}

	var StoreObj = function(key, compare, writeCallback){
		var value = ko.observable(compare ? getValue(key) == compare : getValue(key));
		this.read = function(){
			return value();
		}
		this.write = function(newValue){
			window.localStorage.setItem(key, newValue);
			value(newValue);
			if (writeCallback) writeCallback(newValue);
		}
	}

	this.retryCount = ko.observable(0);
	this.loadingUser = ko.observable(false);
	this.hiddenWindowOpen = ko.observable(false);
	this.loadoutMode = ko.observable(false);
	this.destinyDbMode = ko.observable(false);
	this.activeLoadout = ko.observable(new Loadout());
	this.loadouts = ko.observableArray();
	this.searchKeyword = ko.observable(defaults.searchKeyword);
	this.activeView = ko.computed(new StoreObj("activeView"));
	this.doRefresh = ko.computed(new StoreObj("doRefresh", "true"));
	this.autoTransferStacks = ko.computed(new StoreObj("autoTransferStacks", "true"));	
	this.padBucketHeight = ko.computed(new StoreObj("padBucketHeight", "true"));
	this.tooltipsEnabled = ko.computed(new StoreObj("tooltipsEnabled", "true", function(newValue){ $ZamTooltips.isEnabled = newValue; }));
	this.refreshSeconds = ko.computed(new StoreObj("refreshSeconds"));
	this.tierFilter = ko.computed(new StoreObj("tierFilter"));
	this.typeFilter = ko.observable(defaults.typeFilter);
	this.dmgFilter =  ko.observableArray(defaults.dmgFilter);
	this.progressFilter =  ko.observable(defaults.progressFilter);
	this.setFilter = ko.observableArray(defaults.setFilter);
	this.setFilterFix = ko.observableArray(defaults.setFilter);
	this.shareView =  ko.observable(defaults.shareView);
	this.shareUrl  = ko.observable(defaults.shareUrl);
	this.showMissing =  ko.observable(defaults.showMissing);
	this.showDuplicate = ko.observable(defaults.showDuplicate);

	this.activeItem = ko.observable();
	this.activeUser = ko.observable(new User());

	this.weaponTypes = ko.observableArray();
	this.characters = ko.observableArray();
	this.orderedCharacters = ko.computed(function(){
		return self.characters().sort(function(a,b){
			return a.order - b.order;
		});
	});
	
	this.createLoadout = function(){
		self.loadoutMode(true);
		self.activeLoadout(new Loadout());
	}
	this.cancelLoadout = function(){
		self.loadoutMode(false);
		self.activeLoadout(new Loadout());
	}

	this.showHelp = function(){
		(new tgd.dialog).title("Help").content($("#help").html()).show();
	}

	this.showAbout = function(){
		(new tgd.dialog).title("About").content($("#about").html()).show();
	}

	this.clearFilters = function(model, element){
		self.activeView(defaults.activeView);
		self.searchKeyword(defaults.searchKeyword);
		self.doRefresh(defaults.doRefresh);
		self.refreshSeconds(defaults.refreshSeconds);
		self.tierFilter(defaults.tierFilter);
		self.typeFilter(defaults.typeFilter);
		self.dmgFilter.removeAll();
		self.progressFilter(defaults.progressFilter);		
		self.setFilter.removeAll()
		self.setFilterFix.removeAll()
		self.shareView(defaults.shareView);
		self.shareUrl (defaults.shareUrl);
		self.showMissing(defaults.showMissing);
		self.showDuplicate(defaults.showDuplicate);
		$(element.target).removeClass("active");
		return false;
	}
	this.renderCallback = function(context, content, element, callback){
		if (element) lastElement = element
		var instanceId = $(lastElement).attr("instanceId"), activeItem, $content = $("<div>" + content + "</div>");
		self.characters().forEach(function(character){
		  ['weapons','armor'].forEach(function(list){
	          var item = _.findWhere( character[list](), { '_id': instanceId });
			  if (item) activeItem = item;
	      });
	   	});
		if (activeItem){
			/* Damage Colors */
			if ($content.find("[class*='destt-damage-color-']").length == 0 && activeItem.damageType > 1){
				var burnIcon = $("<div></div>").addClass("destt-primary-damage-" + activeItem.damageType);
				$content.find(".destt-primary").addClass("destt-damage-color-" + activeItem.damageType).prepend(burnIcon);
			}
			/* Weapon Perks */
			if ( (activeItem.perks && $content.find(".destt-talent").length == 0) ){
				$content.find(".destt-info").prepend(perksTemplate({ perks: activeItem.perks }));
			}
			/* Armor Perks */
			else if (activeItem.perks && DestinyArmorPieces.indexOf(activeItem.bucketType) > -1 && self.tierType !== 6){
				$content.find(".destt-talent").replaceWith( perksTemplate({ perks: activeItem.perks }));
			}
			/* Armor Stats */
			var stats = $content.find(".destt-stat");
			if (activeItem.stats && stats.length > 0){
				stats.html(
					stats.find(".stat-bar").map(function(index, stat){
						var $stat = $("<div>"+stat.outerHTML+"</div>"),
							label = $stat.find(".stat-bar-label"),
							labelText = $.trim(label.text());
						if (labelText in activeItem.stats){
							label.text(labelText + ": " + activeItem.stats[labelText]);
							$stat.find(".stat-bar-static-value").text(" Min/Max: " + $stat.find(".stat-bar-static-value").text());
						}
						return $stat.html();
					}).get().join("")
				);
			}
			$content.find(".destt-primary-min").html( activeItem.primaryStat );
		}
		else {
			//remove the "Emblem" title from the image issue #31
			if ($content.find(".fhtt-emblem").length > 0){
				$content.find("span").remove();
			}
		}
		var width = $(window).width();
		//this fixes issue #35 makes destinydb tooltips fit on a mobile screen
		if (width < 340){
			$content.find(".fhtt.des").css("width", (width-15) + "px");
			$content.find(".stat-bar-empty").css("width", "125px");
		}
		callback($content.html());
	}
	this.toggleRefresh = function(){
		self.toggleBootstrapMenu();
		self.doRefresh(!self.doRefresh());
	}
	this.togglePadBucketHeight = function(){
		self.toggleBootstrapMenu();
		self.padBucketHeight(!self.padBucketHeight());
		self.bucketSizeHandler();
	}
	this.toggleTransferStacks = function(){
		self.toggleBootstrapMenu();
		self.autoTransferStacks(!self.autoTransferStacks());
	}
	this.toggleDestinyDbMode = function(){
		self.toggleBootstrapMenu();
		self.destinyDbMode(!self.destinyDbMode());
	}
	this.toggleDestinyDbTooltips = function(){
		self.toggleBootstrapMenu();
		self.tooltipsEnabled(!self.tooltipsEnabled());
	}
	this.toggleShareView = function(){
		self.toggleBootstrapMenu();
		self.shareView(!self.shareView());
	}
	this.toggleDuplicates = function(model, event){
		self.toggleBootstrapMenu();
		self.showDuplicate(!self.showDuplicate());
	}
	this.toggleShowMissing = function(){
		self.toggleBootstrapMenu();
		self.showMissing(!self.showMissing());
	}
	this.setSetFilter = function(model, event){
		self.toggleBootstrapMenu();
		var collection = $(event.target).parent().attr("value");
		self.setFilter(collection == "All" ? [] : _collections[collection]);
		self.setFilterFix(collection == "All" ? [] : _collectionsFix[collection]);
	}
	this.setView = function(model, event){
		self.toggleBootstrapMenu();
		self.activeView($(event.target).parent().attr("value"));
	}
	this.setDmgFilter = function(model, event){
		self.toggleBootstrapMenu();
		var dmgType = $(event.target).parents('li:first').attr("value");
		self.dmgFilter.indexOf(dmgType) == -1 ? self.dmgFilter.push(dmgType) : self.dmgFilter.remove(dmgType);
	}
	this.setTierFilter = function(model, event){
		self.toggleBootstrapMenu();
		self.tierFilter($(event.target).parent().attr("value"));
	}
	this.setTypeFilter = function(model, event){
		self.toggleBootstrapMenu();
		self.typeFilter($(event.target).parent().attr("value"));
	}	
	this.setProgressFilter = function(model, event){
		self.toggleBootstrapMenu();
		self.progressFilter($(event.target).parent().attr("value"));
	}
	this.missingSets = ko.computed(function(){
		var missingIds = [];
		self.setFilter().concat(self.setFilterFix()).forEach(function(item){
		   var itemFound = false;
		   self.characters().forEach(function(character){
			  ['weapons','armor'].forEach(function(list){
		          if (_.pluck( character[list](), 'id') .indexOf(item) > -1) itemFound = true;
		      });
		   });
		   if (!itemFound) missingIds.push(item);
		});
		return missingIds;
	})

	var processItem = function(profile){
		return function(item){
			if (!(item.itemHash in window._itemDefs)){
				console.log("found an item without a definition! " + JSON.stringify(item));
				console.log(item.itemHash);
				return;
			}
			var info = window._itemDefs[item.itemHash];
			if (info.bucketTypeHash in DestinyBucketTypes){
				var description = info.itemName;
				try{ description = decodeURIComponent(info.itemName); }catch(e){ description = info.itemName; }
				var itemObject = {
					id: item.itemHash,
					_id: item.itemInstanceId,
					characterId: profile.id,
					damageType: item.damageType,
					damageTypeName: DestinyDamageTypes[item.damageType],
					isEquipped: item.isEquipped,
					isGridComplete: item.isGridComplete,
					locked: item.locked,
					description: description,
					bucketType: (item.location == 4) ? "Post Master" : DestinyBucketTypes[info.bucketTypeHash],
					type: info.itemSubType,
					typeName: info.itemTypeName,
					tierType: info.tierType,
					icon: dataDir + info.icon
				};
				tgd.duplicates.push(item.itemHash);
				if (item.primaryStat){
					itemObject.primaryStat = item.primaryStat.value;
				}
				if (item.progression){
					itemObject.progression = (item.progression.progressToNextLevel == 0 && item.progression.currentProgress > 0);
				}
				
				itemObject.weaponIndex = DestinyWeaponPieces.indexOf(itemObject.bucketType);
				itemObject.armorIndex = DestinyArmorPieces.indexOf(itemObject.bucketType);
				/* both weapon engrams and weapons fit under this condition*/
				if ( (itemObject.weaponIndex > -1 || itemObject.armorIndex > -1) && item.perks.length > 0 ){
					itemObject.perks = item.perks.map(function(perk){
						if (perk.perkHash in window._perkDefs){
							var p = window._perkDefs[perk.perkHash];
							return {
								iconPath: self.bungie.getUrl() + perk.iconPath,
								name: p.displayName,
								description: p.displayDescription
							}
						}
						else {
							return perk;
						}
					});
					itemObject.isUnique = false;
				}

				if (itemObject.typeName && itemObject.typeName == "Emblem"){
					itemObject.backgroundPath = self.makeBackgroundUrl(info.secondaryIcon);
				}
				if (itemObject.bucketType == "Materials" || itemObject.bucketType == "Consumables"){
					itemObject.primaryStat = item.stackSize;
				}
				if ( info.itemType == 2 && itemObject.bucketType != "Class Items" ){
					itemObject.stats = {};
					_.each(item.stats, function(stat){
						if (stat.statHash in window._statDefs){
							var p = window._statDefs[stat.statHash];
							itemObject.stats[p.statName] = stat.value;
						}
					});
				}
				//console.log("new item time " + (new Date()-t));
				profile.items.push( new Item(itemObject,profile) );
			}
		}
	}

	this.addWeaponTypes = function(weapons){
		weapons.forEach(function(item){
			if (item.type > 0 && _.where(self.weaponTypes(), { type: item.type }).length == 0){
				self.weaponTypes.push({ name: item.typeName, type: item.type });
			}
		});
	}

	this.makeBackgroundUrl = function(path, excludeDomain){
		return "url(" + (excludeDomain ? "" : self.bungie.getUrl()) + path + ")";
	}

	this.hasBothAccounts = function(){
		return !_.isEmpty(self.activeUser().psnId) && !_.isEmpty(self.activeUser().gamerTag);
	}

	this.useXboxAccount = function(){
		self.activeUser().activeSystem("XBL");
		self.characters.removeAll();
		self.loadingUser(true);
		self.search();
	}

	this.usePlaystationAccount = function(){
		self.activeUser().activeSystem("PSN");
		self.characters.removeAll();
		self.loadingUser(true);
		self.search();
	}

	this.search = function(){
		tgd.duplicates.removeAll();
		var total = 0, count = 0, profiles = [];
		/* TODO: implement a better loading bar by using the counts and this: #loadingBar */
		function done(profile){			
			//profiles.push(profile);
			count++;
			if (count == total){
				//self.characters(profiles); 
				self.shareUrl(new report().de());
				self.loadingUser(false);
				self.loadLoadouts();
				setTimeout(self.bucketSizeHandler, 500);
				//console.timeEnd("avatars.forEach");
			}
		}
		self.bungie.search(self.activeUser().activeSystem(),function(e){
			if (e.error){
				/* if the first account fails retry the next one*/
				if (self.hasBothAccounts()){
					self.activeUser().activeSystem( self.activeUser().activeSystem() == "PSN" ? "XBL" : "PSN" );
					self.search();
				}
				else {
					BootstrapDialog.alert("Error loading inventory " + JSON.stringify(e));
				}
				self.loadingUser(false);
				return
			}
			var avatars = e.data.characters;
			total = avatars.length + 1;
			//console.time("self.bungie.vault");
			self.bungie.vault(function(results){
				var buckets = results.data.buckets;
				var profile = new Profile({
					race: "",
					order: 0,
					gender: "Tower",
					classType: "Vault",
					id: "Vault",
					level: "",
					imgIcon: "assets/vault_icon.jpg",
					icon: self.makeBackgroundUrl("assets/vault_icon.jpg",true),
					background: self.makeBackgroundUrl("assets/vault_emblem.jpg",true)
				});

				buckets.forEach(function(bucket){
					bucket.items.forEach(processItem(profile));
				});
				self.addWeaponTypes(profile.weapons());
				self.characters.push(profile);
				//console.timeEnd("self.bungie.vault");
				done(profile)
			});
			//console.time("avatars.forEach");			
			avatars.forEach(function(character, index){
				self.bungie.inventory(character.characterBase.characterId, function(response) {
					//console.time("new Profile"); 					
					var profile = new Profile({
						order: index+1,
						gender: DestinyGender[character.characterBase.genderType],
						classType: DestinyClass[character.characterBase.classType],
						id: character.characterBase.characterId,
						imgIcon: self.bungie.getUrl() + character.emblemPath,
						icon: self.makeBackgroundUrl(character.emblemPath),
						background: self.makeBackgroundUrl(character.backgroundPath),
						level: character.characterLevel,
						race: window._raceDefs[character.characterBase.raceHash].raceName
					}); 
					var items = [];

					 
					Object.keys(response.data.buckets).forEach(function(bucket){
						response.data.buckets[bucket].forEach(function(obj){
							obj.items.forEach(function(item){
								items.push(item);
							});
						});
					});
					//simulate me having the 4th horseman
					//items.push({"itemHash":2344494718,"bindStatus":0,"isEquipped":false,"itemInstanceId":"6917529046313340492","itemLevel":22,"stackSize":1,"qualityLevel":70});
					//console.time("processItems");
					items.forEach(processItem(profile));					
					//console.timeEnd("processItems");
					self.addWeaponTypes(profile.items());					
					//console.timeEnd("new Profile");
					self.characters.push(profile);
					done(profile);
				});
			});
		});
	}
    
	this.loadData = function(ref){
		if (self.loadingUser() == false || self.hiddenWindowOpen() == true){
			//window.t = (new Date());
			self.loadingUser(true);
			self.bungie = new bungie(self.bungie_cookies);
			self.characters.removeAll();
			//console.time("self.bungie.user");
			self.bungie.user(function(user){
				//console.timeEnd("self.bungie.user");
				if (user.error){
					if (user.error == 'network error:502'){
						try {						
							window.cookies.clear(function() {
							    BootstrapDialog.alert('Cookies cleared!');
							});
						}catch(e){
							window.ref = window.open('https://www.bungie.net/', '_blank', 'location=yes,clearsessioncache=yes');
							BootstrapDialog.alert('Clearing cookies not supported in this version, please contact support for more assitance.');
						}
					}
					if (isMobile){ 
						if ( self.hiddenWindowOpen() == false ){
							self.hiddenWindowOpen(true);
							self.openHiddenBungieWindow();
						}
						else {
							setTimeout(function(){ self.loadData(ref); },1000);
						}
					}
					else {
						self.activeUser(new User(user));
						self.loadingUser(false);
					}
					return
				}
				if (ref && ref.close){
					ref.close();
					self.hiddenWindowOpen(false);
					ref = null;
				}
				self.activeUser(new User(user));
				self.loadingUser(false);
				_.defer(function(){
					self.search();
				});
			});
		}
	}

	this.toggleBootstrapMenu = function(){
		if ($(".navbar-toggle").is(":visible"))
			$(".navbar-toggle").click();
	}

	this.refreshButton = function(){
		self.toggleBootstrapMenu();
		self.refresh();
	}
	
	this.refresh = function(){
		self.loadingUser(true);
		self.characters.removeAll();
		self.search();
	}

	this.refreshHandler = function(){
		clearInterval(self.refreshInterval);
		if (self.loadoutMode() == true){
			self.toggleBootstrapMenu();
			$("body").css("padding-bottom","260px");
		}
		else {
			$("body").css("padding-bottom","80px");
		}
		if (self.doRefresh() == 1 && self.loadoutMode() == false){
			self.refreshInterval = setInterval(function(){ self.loadData() }, self.refreshSeconds() * 1000);
		}
	}

	this.bucketSizeHandler = function(){
		var buckets = $(".profile:gt(0) .itemBucket").css("height", "auto");
		if ( self.padBucketHeight() == true ){
			var maxHeight = ($(".bucket-item:visible:eq(0)").height() + 2) * 3;
			buckets.css("min-height", maxHeight);
		}
	}

	this.quickIconHighlighter = function(){
		var scrollTop = $(window).scrollTop();
		$(".profile").each(function(index, item){
		   var $item = $(item);
		   var $quickIcon = $(".quickScrollView ." + $item.attr('id'));
		   var top =  $item.position().top - 55;
		   var bottom = top + $item.height();
		   $quickIcon.toggleClass("activeProfile", scrollTop >= top && scrollTop <= bottom);
		});
	}

	this.showVersion = function(){
		BootstrapDialog.alert("Current version is " + $(".version:first").text());
	}
	
	this.donate = function(){
		window.open("http://bit.ly/1Jmb4wQ","_system"); 
	}

	this.readBungieCookie = function(ref, loop){
		//console.log( typeof ref.executeScript );
		//console.log( Object.keys(ref) ); 
		try {
			ref.executeScript({
				code: 'document.cookie'
			}, function(result) {
				console.log("result " + result);
				if ((result || "").toString().indexOf("bungled") > -1){
					self.bungie_cookies = result;
					window.localStorage.setItem("bungie_cookies", result);
					self.loadData(ref, loop);
				}
			});
		}catch(e){
			console.log(e);
		}
		
	}

	this.openHiddenBungieWindow = function(){
		 window.ref = window.open("https://www.bungie.net/en/User/Profile", '_blank', 'location=no,hidden=yes');
		 ref.addEventListener('loadstop', function(event) {
			//BootstrapDialog.alert("loadstop hidden");
			self.readBungieCookie(ref, 1);
		});
	}
	
	this.openBungieWindow = function(type){
		return function(){
			var loop;
			if (isChrome || isMobile){
				window.ref = window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'location=yes');
			}
			else {
				window.ref = window.open('about:blank'); 
				window.ref.opener = null; 
				window.ref.open('https://www.bungie.net/en/User/SignIn/' + type, '_blank', 'toolbar=0,location=0,menubar=0'); 
			}	
			if (isMobile && !isKindle){
				ref.addEventListener('loadstop', function(event) {
					self.readBungieCookie(ref, loop);
				});
				ref.addEventListener('exit', function() {
					if (self.loadingUser() == false){
						if (_.isEmpty(self.bungie_cookies)){
							self.readBungieCookie(ref, loop);
						}
						else {
							self.loadData();
						}
					}
				});
			}
			else {
				clearInterval(loop);
				loop = setInterval(function(){
					if (window.ref.closed){
						clearInterval(loop);
						if (isKindle){
							self.readBungieCookie(ref, loop);
						}
						else {
							self.loadData();
						}
					}
				}, 100);
			}
		}
	}

	this.scrollTo = function(distance){
		if ( isWindowsPhone ){
			$('html,body').scrollTop(distance);
		}
		else {
			$("body").animate({ scrollTop: distance }, 300, "swing");
		}
	}
	
	this.scrollToActiveIndex = function(){
		var index = $(".quickScrollView img").filter(function(){
			return $(this).attr("class").indexOf("activeProfile") > -1
		}).index(".quickScrollView img");
		self.scrollTo( $(".profile:eq("+index+")").position().top - 50 );
	}
	
	this.shiftViewLeft = function(){
		var newIndex = parseInt(self.activeView()) - 1;
		if (newIndex <= 0) newIndex = 3;
		self.activeView(newIndex);
		self.scrollToActiveIndex();
	}
	
	this.shiftViewRight = function(){
		var newIndex = parseInt(self.activeView()) + 1;
		if (newIndex == 4) newIndex = 1;
		self.activeView(newIndex);
		self.scrollToActiveIndex();
	}

	this.requests = {};
	var id = -1;
	this.apiRequest = function(params, callback){
		var apiURL = "https://www.towerghostfordestiny.com/api.cfm";
		if ( isChrome || isMobile ){
			$.ajax({
				url: apiURL,
				data: params,
				type: "POST",
				dataType: "json",
				success: function(response){
					callback(response);
				}
			});
		}
		else {
			var event = document.createEvent('CustomEvent');
			var opts = {
				route: apiURL,
				payload: params,
				method: "POST",
				complete: callback
			}
			event.initCustomEvent("api-request-message", true, true, { id: ++id, opts: opts });
			self.requests[id] = opts;
			document.documentElement.dispatchEvent(event);	
		}
	}

	this.saveLoadouts = function(includeMessage){
		var _includeMessage = _.isUndefined(includeMessage) ? true : includeMessage;
		if (supportsCloudSaves == true){
			var params = {
				action: "save",
				membershipId: parseFloat(app.activeUser().user.membershipId),
				loadouts: JSON.stringify(self.loadouts())
			}
			self.apiRequest(params, function(results){
				if (_includeMessage == true){
					if (results.success) BootstrapDialog.alert("Loadouts saved to the cloud");
					else BootstrapDialog.alert("Error has occurred saving loadouts");
				}
			});
		}
		else {
			var loadouts = ko.toJSON(self.loadouts());
			window.localStorage.setItem("loadouts", loadouts);
		}
	}

	this.loadLoadouts = function(){
		var _loadouts = window.localStorage.getItem("loadouts");
		if (!_.isEmpty(_loadouts)){
			_loadouts = _.map(JSON.parse(_loadouts), function(loadout){
				return new Loadout(loadout);
			})
		}
		else {
			_loadouts = [];
		}
		if (supportsCloudSaves == true){
			self.apiRequest({ action: "load", membershipId: parseFloat(self.activeUser().user.membershipId) }, function(results){
				var _results = [];
				if (results && results.loadouts){
				    _results = _.isArray(results.loadouts) ? results.loadouts : [results.loadouts];
					_results = _.map(_results, function(loadout){
						loadout.ids = _.isArray(loadout.ids) ? loadout.ids : [loadout.ids];
						loadout.equipIds = _.isEmpty(loadout.equipIds) ? [] : loadout.equipIds;
						loadout.equipIds = _.isArray(loadout.equipIds) ? loadout.equipIds : [loadout.equipIds];
						return new Loadout(loadout);
					});
				}
				/* one time migrate joins the two arrays and clears the local one */
				if(_loadouts.length > 0){
					_results = _loadouts.concat(_results);
					window.localStorage.setItem("loadouts", "");
				}
				self.loadouts(_results);
				/* one time migrate saves the new joined array to the cloud */
				if(_loadouts.length > 0){
					self.saveLoadouts(false);
				}
			});
		}
		else if (_loadouts.length > 0){
			self.loadouts(_loadouts);
		}
	}
	this.whatsNew = function(){
		if ( $("#showwhatsnew").text() == "true" ){
			var version = parseInt($(".version:first").text().replace(/\./g,'')); 
			var cookie = window.localStorage.getItem("whatsnew");
			if ( _.isEmpty(cookie) || parseInt(cookie) < version ){
				(new tgd.dialog).title("Tower Ghost for Destiny Updates").content(JSON.parse(unescape($("#whatsnew").html())).content).show(false, function(){
					window.localStorage.setItem("whatsnew", version.toString());
				})
			}
		}			
	}
	
	this.init = function(){
		self.doRefresh.subscribe(self.refreshHandler);
		self.refreshSeconds.subscribe(self.refreshHandler);
		self.loadoutMode.subscribe(self.refreshHandler);
		self.bungie_cookies = "";
		if (window.localStorage && window.localStorage.getItem){
			self.bungie_cookies = window.localStorage.getItem("bungie_cookies");
		}
		var isEmptyCookie = (self.bungie_cookies || "").indexOf("bungled") == -1;
		(function() {
		  if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
		    var msViewportStyle = document.createElement("style");
		    msViewportStyle.appendChild(
		      document.createTextNode("@-ms-viewport{width:auto!important}")
		    );
		    document.getElementsByTagName("head")[0].appendChild(msViewportStyle);
		  }
		})();

		if (isMobile){
			Hammer(document.getElementById('charactersContainer'))
				.on("swipeleft", self.shiftViewLeft)
				.on("swiperight", self.shiftViewRight);
		}

		if (isMobile) {
		    if (window.device && device.platform === "iOS" && device.version >= 7.0) {
				StatusBar.overlaysWebView(false);
		    }
			if (typeof StatusBar !== "undefined"){
			    StatusBar.styleBlackOpaque();
			    StatusBar.backgroundColorByHexString("#272B30");
			}
		}

		if (isMobile && isEmptyCookie){
			self.bungie = new bungie();
			self.activeUser(new User({"code": 99, "error": "Please sign-in to continue."}));
		}
		else {
			setTimeout(function(){ self.loadData() }, isChrome || isMobile ? 1 : 5000);
		}
		$("form").bind("submit", false);
		$("html").click(function(e){
			if ($("#move-popup").is(":visible") && e.target.className !== "itemImage") {
				$("#move-popup").hide();
			}
		});
		/* this fixes issue #16 */
		$(window).resize(_.throttle(self.bucketSizeHandler, 500));
		$(window).resize(_.throttle(self.quickIconHighlighter, 500));
		$(window).scroll(_.throttle(self.quickIconHighlighter, 500));
		self.whatsNew();
		ko.applyBindings(self);
	}
});

window.zam_tooltips = { addIcons: false, colorLinks: false, renameLinks: false, renderCallback: app.renderCallback, isEnabled: app.tooltipsEnabled() };
BootstrapDialog.defaultOptions.nl2br = false;

if (isMobile){
	window.addEventListener("statusTap", function() {
	    var target = $("body");

	    //disable touch scroll to kill existing inertial movement
	    target.css({
	        '-webkit-overflow-scrolling' : 'auto',
	        'overflow-y' : 'hidden'
	    });

	    //animate
	    target.animate({ scrollTop: 0}, 300, "swing", function(){

	        //re-enable touch scrolling
	        target.css({
	            '-webkit-overflow-scrolling' : 'touch',
	            'overflow-y' : 'scroll'
	        });
	    });
	});
	document.addEventListener('deviceready', app.init, false);
} else {
	$(document).ready(app.init);
}

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://ssl.google-analytics.com/analytics.js','ga');

ga('create', 'UA-61575166-1', 'auto');
ga('send', 'pageview');