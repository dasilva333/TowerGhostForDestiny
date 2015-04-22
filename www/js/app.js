window.isChrome = (typeof chrome !== "undefined");
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(navigator.userAgent));
window.supportsCloudSaves = window.isChrome || window.isMobile;

var dialog = (function(options){
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
	
	this.show = function(cb){
		self.modal.open();
		return self;
	}
	
	return self.modal;
});

var filterItemByType = function(type, isEquipped){
	return function(weapon){
		if (weapon.bucketType == type && weapon.isEquipped() == isEquipped)
			return weapon;
	}
}

var Profile = function(model){
	var self = this;
	_.each(model, function(value, key){
		self[key] = value;
	});
	
	this.icon = ko.observable(self.icon);	
	this.background = ko.observable(self.background);
	this.items = ko.observableArray([]);
	this.uniqueName = self.level + " " + self.race + " " + self.gender + " " + self.classType;
	this.weapons = ko.computed(this._weapons, this);
	this.armor = ko.computed(this._armor, this);
	this.general = ko.computed(this._general, this);
	this.postmaster = ko.computed(this._postmaster, this);
	this.container = ko.observable();
}

Profile.prototype = {
	_weapons: function(){
		return _.filter(this.items(), function(item){
			if (DestinyWeaponPieces.indexOf(item.bucketType) > -1 )
				return item;
		});
	},	
	_armor: function(){
		return _.filter(this.items(), function(item){
			if (DestinyArmorPieces.indexOf(item.bucketType) > -1 )
				return item;
		});
	},
	_general: function(){
		return _.filter(this.items(), function(item){
			if (DestinyArmorPieces.indexOf(item.bucketType) == -1 && DestinyWeaponPieces.indexOf(item.bucketType) == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Subclasses")
				return item;
		});
	},
	_postmaster: function(){
		return _.filter(this.items(), function(item){
			if (item.bucketType == "Post Master")
				return item;
		});
	},
	get: function(type){
		return this.items().filter(filterItemByType(type, false));
	},
	itemEquipped: function(type){
		return ko.utils.arrayFirst(this.items(), filterItemByType(type, true));
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
	this.setActiveItem = function(){
		app.activeItem(self);
	}
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
				(self.bucketType == 'Subclasses' && self.isEquipped() && self.character.id == avatarId);
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
		var uniqueFilter = $parent.showUniques() == false || ($parent.showUniques() == true && self.isUnique);
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
		return (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (typeFilter) && (uniqueFilter);
	},
	/* helper function that unequips the current item in favor of anything else */
	unequip: function(callback){
		var self = this;
		//console.log('trying to unequip too!');
		if (self.isEquipped() == true){
			//console.log("and its actually equipped");
			var otherEquipped = false, itemIndex = -1;
			var otherItems = _.filter(_.where( self.character.items(), { bucketType: self.bucketType }), function(item){
				return item.tierType != 6;
			});
			if ( otherItems.length > 0){
				var tryNextItem = function(){			
					var item = otherItems[++itemIndex];
					//console.log(item.description);
					/* still haven't found a match */
					if (otherEquipped == false){
						if (item != self){
							//console.log("trying to equip " + item.description);
							item.equip(self.characterId, function(isEquipped){
								//console.log( item.description + " result was " + isEquipped);
								if (isEquipped == true){ otherEquipped = true; callback(); }
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
				tryNextItem();			
			}
			else {
				callback(false);
			}
		}
		else {
			//console.log("but not equipped");
			callback();
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
		//console.log("equip called");
		var sourceCharacterId = self.characterId;		
		if (targetCharacterId == sourceCharacterId){
			//console.log("item is already in the character");
			/* if item is exotic */
			if ( self.tierType == 6 && allowReplacement){
				//console.log("item is exotic");
				var otherExoticFound = false,
					otherBucketTypes = DestinyWeaponPieces.indexOf(self.bucketType) > -1 ? _.clone(DestinyWeaponPieces) :  _.clone(DestinyArmorPieces);
				otherBucketTypes.splice(DestinyWeaponPieces.indexOf(self.bucketType),1);
				//console.log("the other bucket types are " + JSON.stringify(otherBucketTypes));	
				_.each(otherBucketTypes, function(bucketType){
					var otherExotic = _.filter(_.where( self.character.items(), { bucketType: bucketType, tierType: 6 }), function(item){
						return item.isEquipped();
					});
					//console.log( "otherExotic: " + JSON.stringify(_.pluck(otherExotic,'description')) );
					if ( otherExotic.length > 0 ){
						//console.log("found another exotic equipped " + otherExotic[0].description);
						otherExoticFound = true;
						otherExotic[0].unequip(done);
					}					
				});
				if (otherExoticFound == false){
					done();
				}
			}
			else {
				//console.log("item is not exotic");
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
			});
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
	store: function(targetCharacterId, callback){
		//console.log("item.store");
		//console.log(arguments);
		var self = this;
		var sourceCharacterId = self.characterId, transferAmount = 1;
		var done = function(){			
			if (targetCharacterId == "Vault"){
				//console.log("from character to vault");
				self.unequip(function(){
					//console.log("calling transfer from character to vault");
					self.transfer(sourceCharacterId, "Vault", transferAmount, callback);
				});
			}
			else if (sourceCharacterId !== "Vault"){
				//console.log("from character to vault to character");
				self.unequip(function(){
					if ( self.bucketType == "Subclasses" ){
						if (callback)
							callback(self.character);
					}
					else {
						//console.log("unquipped item");
						self.transfer(sourceCharacterId, "Vault", transferAmount, function(){
							//console.log("xfered item to vault");
							self.transfer("Vault", targetCharacterId, transferAmount, callback);
						});
					}					
				});
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
				var dialogItself = (new dialog({
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
		        })).title("Transfer Materials").show(),
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
	}
}

var activeElement;
var moveItemPositionHandler = function(element, item){
	return function(){
		if (app.destinyDbMode() == true){
			window.open(item.href,"_blank");
			return false;
		}
		if (app.loadoutMode() == true){
			if (app.activeLoadout().ids().indexOf( item._id )>-1)
				app.activeLoadout().ids.remove(item._id);
			else {
				if (item._id == 0){
					BootstrapDialog.alert("Currently unable to create loadouts with this item type.");
				}
				else if ( _.where( app.activeLoadout().items(), { bucketType: item.bucketType }).length < 9){
					app.activeLoadout().ids.push(item._id);
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
				if (window.isMobile){
					$("body").css("padding-bottom","80px");
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
}

window.ko.bindingHandlers.scrollToView = {
	init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
		Hammer(element, { time: 2000 })
			.on("tap", function(){
				var index = $(".profile#" + viewModel.id).index(".profile");
				$("body").animate({ scrollTop: $(".profile:eq(" + index + ")").position().top - 50 }, 300, "swing")
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

ko.bindingHandlers.moveItem = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {	
		Hammer(element, { time: 2000 })
			.on("tap", moveItemPositionHandler(element, viewModel))
			/* press is actually hold */
			.on("press",function(){
				if (app.loadoutMode() == true){
					viewModel.markAsEquip( viewModel );
				}
				else {
					$ZamTooltips.lastElement = element;
					$ZamTooltips.show("destinydb","items",viewModel.id, element);
				}
			})
    }
};


/*
targetItem: item,
swapItem: swapItem,
description: item.description + "'s swap item is " + swapItem.description
*/
var swapTemplate = _.template('<ul class="list-group">' +	
	'<% swapArray.forEach(function(pair){ %>' +
		'<li class="list-group-item">' +
			'<div class="row">' +
				'<div class="col-lg-6">' +
					'<%= pair.description %>' +
				'</div>' +
				'<div class="col-lg-3">' +
					'<a class="item" href="<%= pair.targetItem.href %>" id="<%= pair.targetItem._id %>">' + 
						'<img class="itemImage" src="<%= pair.targetItem.icon %>">' +
					'</a>' +
				'</div>' +
				'<div class="col-lg-3">' +
					'<a class="item" href="<%= pair.swapItem && pair.swapItem.href %>" id="<%= pair.swapItem && pair.swapItem._id %>">' + 
						'<img class="itemImage" src="<%= pair.swapItem && pair.swapItem.icon %>">' +
					'</a>' +
				'</div>' +
			'</div>' +
		'</li>' +
	'<% }) %>' +
'</ul>');

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

	var defaults = {
		searchKeyword: "",
		doRefresh: isMobile ? false : true,
		refreshSeconds: 300,
		tierFilter: 0,
		typeFilter: 0,
		dmgFilter: [],
		activeView: 0,
		progressFilter: 0,
		setFilter: [],
		shareView: false,
		shareUrl: "",
		showMissing: false,
		showUniques: false,
		tooltipsEnabled: isMobile ? false : true,
		autoTransferStacks: false
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
	this.loadoutMode = ko.observable(false);
	this.destinyDbMode = ko.observable(false);
	this.activeLoadout = ko.observable(new Loadout());
	this.loadouts = ko.observableArray();
	this.searchKeyword = ko.observable(defaults.searchKeyword);
	this.activeView = ko.computed(new StoreObj("activeView"));
	this.doRefresh = ko.computed(new StoreObj("doRefresh", "true"));
	this.autoTransferStacks = ko.computed(new StoreObj("autoTransferStacks", "true"));
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
	this.showUniques =  ko.observable(defaults.showUniques);
	
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
		(new dialog).title("Help").content($("#help").html()).show();
	}
		
	this.showAbout = function(){
		(new dialog).title("About").content($("#about").html()).show();
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
		self.showUniques(defaults.showUniques);
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
	this.toggleShowUniques = function(){
		self.toggleBootstrapMenu();
		self.showUniques(!self.showUniques());
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
			var itemObject = { 
				id: item.itemHash,
				_id: item.itemInstanceId,
				characterId: profile.id,
				damageType: item.damageType,
				damageTypeName: DestinyDamageTypes[item.damageType],
				description: info.itemName, 
				bucketType: DestinyBucketTypes[info.bucketTypeHash],
				type: info.itemSubType, //12 (Sniper)
				typeName: info.itemTypeName, //Sniper Rifle
				tierType: info.tierType, //6 (Exotic) 5 (Legendary)
				icon: self.bungie.getUrl() + info.icon,
				isEquipped: item.isEquipped,
				isGridComplete: item.isGridComplete,
				locked: item.locked
			};
			/*if ( itemObject.description.indexOf("Painted") > -1 ){
				console.log(itemObject);
				console.log(info);
				console.log(itemObject.typeName + " " + info.classType);
			}*/
			if (item.primaryStat){
				itemObject.primaryStat = item.primaryStat.value;
			}	
			if (item.progression){
				itemObject.progression = (item.progression.progressToNextLevel == 0 && item.progression.currentProgress > 0);
			}
			if (item.location == 4)
				itemObject.bucketType = "Post Master";

			if (info.bucketTypeHash in DestinyBucketTypes){
			
				/* both weapon engrams and weapons fit under this condition*/
				if ( (DestinyWeaponPieces.indexOf(itemObject.bucketType) > -1 || DestinyArmorPieces.indexOf(itemObject.bucketType) > -1) && item.perks.length > 0 ){
					itemObject.perks = item.perks.map(function(perk){
						if (perk.perkHash in window._perkDefs){
							var p = window._perkDefs[perk.perkHash];
							return {
								iconPath: app.bungie.getUrl() + perk.iconPath,
								name: p.displayName,
								description: p.displayDescription
							}
						}
						else {
							return perk;
						}					
					});
					if (info.talentGridHash in window._talentGridDefs){					
						itemObject.isUnique = info.tierType != 6 && (_.pluck(_.where(window._talentGridDefs[info.talentGridHash].nodes,{column:5}),'isRandom').indexOf(true) > -1);
					}
					else {
						itemObject.isUnique = false;
					}				
				}
			
				if (itemObject.typeName && itemObject.typeName == "Emblem"){
					itemObject.backgroundPath = self.makeBackgroundUrl(info.secondaryIcon);
				}
				if (itemObject.bucketType == "Materials" || itemObject.bucketType == "Consumables"){
					itemObject.primaryStat = item.stackSize;
				}
				if ( info.itemType == 2 ){
					itemObject.stats = {};
					_.each(item.stats, function(stat){
						if (stat.statHash in window._statDefs){
							var p = window._statDefs[stat.statHash];
							itemObject.stats[p.statName] = stat.value;
						}
					});
				}
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
		var total = 0, count = 0;
		/* TODO: implement a better loading bar by using the counts and this: #loadingBar */
		function done(){
			count++;
			if (count == total){
				//console.log("finished loading");
				self.shareUrl(new report().de());
				self.loadingUser(false);
				self.loadLoadouts();
				setTimeout(self.bucketSizeHandler, 500);
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
					BootstrapDialog.alert("Account has no data");
				}				
				self.loadingUser(false);
				return
			}
			var avatars = e.data.characters;
			total = avatars.length + 1;
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
				done()
			});
			avatars.forEach(function(character, index){
				self.bungie.inventory(character.characterBase.characterId, function(response) {
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
					
					items.forEach(processItem(profile));
					self.addWeaponTypes(profile.items());
					self.characters.push(profile);
					done();
				});
			});
		});		
	}
	
	this.loadData = function(ref){
		if (self.loadingUser() == false){
			self.loadingUser(true);
			self.bungie = new bungie(self.bungie_cookies); 
			self.characters.removeAll();
			self.bungie.user(function(user){
				self.activeUser(new User(user));
				if (user.error){
					self.loadingUser(false);
					if (ref && ref.close){
						self.readBungieCookie(ref);
					}
					return
				}
				if (ref && ref.close){
					ref.close();
					//fix for issue #3?
					ref = null;
				}
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
		self.loadData();
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
		//TODO: max height should include padding and borders
		var maxHeight = $(".itemImage:visible:eq(0)").height() * 3;
		buckets.css("min-height", maxHeight);	
	}
	
	this.quickIconHighlighter = function(){
		var scrollTop = $(window).scrollTop();
		$(".profile").each(function(index, item){
		   var $item = $(item);
		   var $quickIcon = $(".quickScrollView ." + $item.attr('id'));
		   var top =  $item.position().top - 55;
		   var bottom = top + $item.height();
		   $quickIcon.css("border", (scrollTop >= top && scrollTop <= bottom) ? "3px solid white" : "none");
		});
	}
	
	this.donate = function(){
		window.open("http://bit.ly/1Jmb4wQ","_blank");
	}
	
	this.readBungieCookie = function(ref, loop){
		ref.executeScript({
			code: 'document.cookie'
		}, function(result) {
			if ((result || "").toString().indexOf("bungled") > -1){
				self.bungie_cookies = result;
				window.localStorage.setItem("bungie_cookies", result);
				self.loadData(ref, loop);
			}
		});	
	}
	
	this.openBungieWindow = function(type){
		return function(){
			var loop;
			window.ref = window.open('https://www.bungie.net/en/User/SignIn/' + type + "?bru=%252Fen%252FUser%252FProfile", '_blank', 'location=yes');			
			if (isMobile){
				ref.addEventListener('loadstop', function(event) {
					ref.executeScript({
						code: 'document.location.href'
					}, function(result) {
						self.readBungieCookie(ref, loop);
					});					
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
						self.loadData();
					}
				}, 100);
			}
		}
	}
	
	this.shiftArrayLeft = function(){
		self.characters.unshift( self.characters.splice(self.characters().length-1,1)[0] );
	}
	this.shiftArrayRight = function(){
		self.characters(self.characters().concat( self.characters.splice(0,1) ));
	}
	
	this.yqlRequest = function(params, callback){
		var request = window.encodeURIComponent("http://www.towerghostfordestiny.com/api.cfm?" + $.param(params))
		var requestURL = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D%22" + request + "%22&format=json&callback=";
		$.ajax({
			url: requestURL,
			success: function(response){
				callback(response.query.results);
			}
		});
	}
	
	this.saveLoadouts = function(includeMessage){
		var _includeMessage = _.isUndefined(includeMessage) ? true : includeMessage;
		if (supportsCloudSaves == true){
			var params = {
				action: "save",
				membershipId: parseFloat(app.activeUser().user.membershipId),
				loadouts: JSON.stringify(self.loadouts())
			}
			self.yqlRequest(params, function(results){
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
			self.yqlRequest({ action: "load", membershipId: parseFloat(self.activeUser().user.membershipId) }, function(results){
				var _results = [];
				if (results && results.json && results.json.loadouts){
				    _results = _.isArray(results.json.loadouts) ? results.json.loadouts : [results.json.loadouts];
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
		/* breaks on Windows Phone
		if (isMobile){
			Hammer(document.getElementById('charactersContainer'))
				.on("swipeleft", self.shiftArrayLeft)
				.on("swiperight", self.shiftArrayRight);
		}*/

		if (isMobile) {
		    if (window.device && device.platform === "iOS" && device.version >= 7.0) {
				StatusBar.overlaysWebView(false);
		    }
			if (typeof StatusBar !== "undefined"){		
			    StatusBar.styleBlackOpaque();
			    StatusBar.backgroundColorByHexString("#000");
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