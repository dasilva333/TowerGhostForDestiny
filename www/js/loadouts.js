	
/*
targetItem: item,
swapItem: swapItem,
description: item.description + "'s swap item is " + swapItem.description
*/
var swapTemplate = _.template('<ul class="list-group">' +	
	'<% swapArray.forEach(function(pair){ %>' +
		'<li class="list-group-item">' +
			'<div class="row">' +
				'<div class="text-center col-xs-12 col-sm-12 col-md-12 col-lg-6">' +
					'<%= pair.description %>' +
				'</div>' +
				'<div class="text-right col-xs-5 col-sm-5 col-md-5 col-lg-2">' +
					'<a class="item" href="<%= pair.targetItem && pair.targetItem.href %>" id="<%= pair.targetItem && pair.targetItem._id %>">' + 
						'<img class="itemImage" src="<%= (pair.targetItem && pair.targetItem.icon) || pair.targetIcon %>">' +
					'</a>' +
				'</div>' +
				'<div class="text-center col-xs-2 col-sm-2 col-md-2 col-lg-2">' +
					'<img src="<%= pair.actionIcon %>">' +
				'</div>' +
				'<div class="text-left col-xs-5 col-sm-5 col-md-5 col-lg-2">' +
					'<a class="item" href="<%= pair.swapItem && pair.swapItem.href %>" id="<%= pair.swapItem && pair.swapItem._id %>">' + 
						'<img class="itemImage" src="<%= (pair.swapItem && pair.swapItem.icon) || pair.swapIcon %>">' +
					'</a>' +
				'</div>' +
			'</div>' +
		'</li>' +
	'<% }) %>' +
'</ul>');

var LoadoutItem = function(model){
	var self = this;
	
	_.each(model, function(value, key){
		self[key] = value;
	});
	this.doEquip = ko.observable(self.doEquip.toString() == "true" || false);
}

var Loadout = function(model){
	var self = this;
	
	_.each(model, function(value, key){
		self[key] = value;
	});	
	this.name = self.name || "";
	this.ids = ko.observableArray();
	this.items = ko.computed(function(){
		var _items = [];
		_.each(self.ids(), function(equip){
			var itemFound = self.findItemById(equip.id);
			if(itemFound){
				itemFound.doEquip = equip.doEquip;
				itemFound.markAsEquip = self.markAsEquip;
				_items.push(itemFound);
			}
			else {
				self.ids.remove(equip.id);
			}
		});	
		return _items.sort(function(a,b){
			if (a.armorIndex > -1){
				return a.armorIndex-b.armorIndex;
			}
			else if (a.weaponIndex > -1){
				return a.weaponIndex - b.weaponIndex;
			}
			else {
				return -1;
			}			
		});
	});
	
	this.markAsEquip = function(item, event){
		var existingItems = _.where( self.ids(), { bucketType: item.bucketType } ).filter(function(loadoutItem){
			var foundItem = _.find(self.items(), { _id: loadoutItem.id });
			//sometimes an item is not found due to it being deleted or reforged, at this point filter it out of the list, issue #135
			if (!foundItem) return false;
			
			if(item.bucketType == "Subclasses" || foundItem.armorIndex != -1) {
			    return item.doEquip() == true && item._id != loadoutItem.id && item.character.classType == foundItem.character.classType;
			}
			return item.doEquip() == true && item._id != loadoutItem.id;
		});
		if ( existingItems.length > 0 ){
			_.each(existingItems, function(loadoutItem){
				loadoutItem.doEquip(false);
			});
		}
		if ( item.doEquip() ){
			_.findWhere( self.ids(), { id: item._id }).doEquip(true);
		}
		return true;
	}
	
	/* loader/migrate code */
	if (model && model.ids && model.ids.length > 0){
		var firstItem = model.ids[0];
		if (firstItem && _.isString(firstItem)){
			//console.log("this model needs a migration " + JSON.stringify(model));
			var _ids = [];
			_.each(model.ids, function(id){
				var equipDef = _.findWhere( model.equipIds, { _id: id });
				var item = self.findItemById(id);
				if ( item )
				_ids.push(new LoadoutItem({
					id: id,
					bucketType: equipDef ? equipDef.bucketType : item.bucketType,
					doEquip: equipDef ? true : false
				}));
			});
			self.ids(_ids);
		}
		else {
			//console.log("this model doesn't need a migration " + JSON.stringify(model));
			self.ids(_.map(model.ids, function(obj){
				//console.log(obj);
				return new LoadoutItem(obj);
			}));
		}
	}
	
}

Loadout.prototype = {
	toJSON: function(){
		var copy = ko.toJS(this); //easy way to get a clean copy
		//copy.items = _.pluck(copy.items, '_id'); //strip out items metadata
		delete copy.items;
		return copy;
	},
	setActive: function(){
		app.loadoutMode(true);
		app.activeLoadout(this);
	},
	remove: function(){
		app.loadouts.remove(this);
		app.createLoadout();
		app.saveLoadouts();
	},
	save: function(){
		var ref = _.findWhere( app.loadouts(), { name: this.name });
		if ( ref ){
			app.loadouts.splice(app.loadouts().indexOf(ref),1);
		}
		app.loadouts.push( this );
		app.saveLoadouts();
	},
	addItem: function(obj){
		this.ids.push(new LoadoutItem(obj));
	},
	findItemById: function(id){
		var itemFound;
		app.characters().forEach(function(character){
			var match = _.findWhere(character.items() , { _id: id });
			if (match) itemFound = _.clone(match);
		});
		return itemFound;
	},	
	/* the object with the .store function has to be the one in app.characters not this copy */
	findReference: function(item){
		var c = _.findWhere(app.characters(),{ id: item.character.id });
		var x = _.findWhere(c.items(),{ _id: item._id });
		return x;
	},	
	swapItems: function(swapArray, targetCharacterId, callback){
		var self = this;
		var onlyEquipped = function(item){
			return item.doEquip() == true;
		}
		var itemIndex = -1, increments = parseInt(Math.round(95 / (1.0 * swapArray.length))), progressValue = 5;
		var loader = $(".bootstrap-dialog-message .progress").show().find(".progress-bar").width( progressValue + "%");
		var transferNextItem = function(){
			//console.log("transferNextItem");
			var pair = swapArray[++itemIndex];
			var transferTargetItem = function(){
				var action = (_.where( self.ids(), { id: pair.targetItem._id }).filter(onlyEquipped).length == 0) ? "store" : "equip";
				//console.log("going to " + action + " first item " + pair.targetItem.description);
				self.findReference(pair.targetItem)[action](targetCharacterId, function(){			
					progressValue = progressValue + increments;
					loader.width( progressValue + "%" );
					transferNextItem();
				});
			}
			if (pair){
				/* swap item has to be moved first in case the swap bucket is full, then move the target item in after */
				if ( typeof pair.swapItem !== "undefined"){
					var owner = pair.targetItem.character.id;
					self.findReference(pair.swapItem).store(owner, function(){
						//console.log("xfered it, now to transfer next item " + pair.swapItem.description);
						if (typeof pair.targetItem !== "undefined"){
							transferTargetItem();
						}	
						else { 
							progressValue = progressValue + increments;
							loader.width( progressValue + "%" );
							transferNextItem();
						}
					}, true);
				}
				else if (typeof pair.targetItem !== "undefined"){
					transferTargetItem();
				}
				else { 
					progressValue = progressValue + increments;
					loader.width( progressValue + "%" );
					transferNextItem(); 
				}
			}
			else {
				//console.log("pair is not defined, calling callback");
				progressValue = progressValue + increments;
				loader.width( progressValue + "%" );
				if (callback)
					callback();
			}
		}
		app.activeLoadout(new Loadout());
		app.loadoutMode(false);
		transferNextItem();
	},
	transfer: function(targetCharacterId){
		var self = this;		
		var subscription = app.loadingUser.subscribe(function(newValue){
			if (newValue == false){
				self.move( targetCharacterId );
				subscription.dispose();
			}
		});
		app.refresh();
	},
	/* before starting the transfer we need to decide what strategy we are going to use */
	/* strategy one involves simply moving the items across assuming enough space to fit in both without having to move other things */
	/* strategy two involves looking into the target bucket and creating pairs for an item that will be removed for it */
	/* strategy three is the same as strategy one except nothing will be moved bc it's already at the destination */
	move: function(targetCharacterId){
		var self = this;
		var targetCharacter = _.findWhere( app.characters(), { id: targetCharacterId });
		var targetCharacterIcon = targetCharacter.icon().replace("url(",'').replace(')','');
		var getFirstItem = function(sourceBucketIds, itemFound){
			return function(otherItem){
				/* if the otherItem is not part of the sourceBucket then it can go */
				if ( sourceBucketIds.indexOf( otherItem._id ) == -1 && itemFound == false){
					itemFound = true;
					sourceBucketIds.push(otherItem._id);
					return otherItem;
				}
			}
		};
		var masterSwapArray= [], sourceItems =  self.items();
		if (sourceItems.length > 0){
			var targetList = targetCharacter.items();				
			var sourceGroups = _.groupBy( sourceItems, 'bucketType' );
			var targetGroups = _.groupBy( targetList, 'bucketType' );	
			var masterSwapArray = _.flatten(_.map(sourceGroups, function(group, key){
				var sourceBucket = sourceGroups[key];
				var targetBucket = targetGroups[key];
				var maxBucketSize = 10;
				if (targetCharacter.id == "Vault"){
					maxBucketSize = ( DestinyWeaponPieces.indexOf(key) > -1 ) ? 36 : 24;
				}
				/* use the swap item strategy */
				/* by finding a random item in the targetBucket that isnt part of sourceBucket */
				if (sourceBucket.length + targetBucket.length >= maxBucketSize){
					var sourceBucketIds = _.pluck( sourceBucket, "_id");
					var swapArray = _.map(sourceBucket, function(item){
						var ownerBucket = _.where( item.character.items(), { bucketType: key });
						var ownerIcon = item.character.icon().replace("url(",'').replace(')','');
						if ( ownerBucket.length == 1 ){
							return {
								description: item.description + " will not be moved. There is no item to replace it.",
								targetIcon: item.icon,
								actionIcon: "assets/cant-transfer.png",
								swapIcon: targetCharacterIcon
							}
						}
						/* if the item is already in the targetBucket */
						if ( _.findWhere( targetBucket, { _id: item._id }) ){
							/* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
							if ( item.doEquip() == true ){
								return {
									targetItem: item,
									description: item.description + " will be equipped.",									
									actionIcon: "assets/to-equip.png",
									swapIcon: targetCharacterIcon
								}
							}
							/* then return an object indicating to do nothing */
							else {
								return {
									description: item.description + " is already in the " + targetCharacter.classType + "'s bucket of " + item.bucketType,
									targetIcon: item.icon,
									actionIcon: "assets/no-transfer.png",
									swapIcon: ownerIcon
								}
							}
						}
						else {
							var itemFound = false;
							var swapItem = _.filter(_.where(targetBucket, { type: item.type }), getFirstItem(sourceBucketIds, itemFound));
							swapItem = (swapItem.length > 0) ? swapItem[0] : _.filter(targetBucket, getFirstItem(sourceBucketIds, itemFound))[0];
							//console.log("found swap item " + swapItem.description);
							if ( swapItem ) {
							    if(swapItem.armorIndex != -1 && item.character.classType != targetCharacter.classType) {
									return {
										description: item.description + " will not be moved",
										targetIcon: item.icon,
										actionIcon: "assets/no-transfer.png",
										swapIcon: ownerIcon
									}
							    }
							    return {
								    targetItem: item,
								    swapItem: swapItem,
								    description: item.description + " will be swapped with " + swapItem.description,
									actionIcon: "assets/swap.png"
							    }
							}
							else {
								return {
									targetItem: item,
									description: item.description + " will be moved",
									swapIcon: ownerIcon,
									actionIcon: "assets/to-transfer.png"
								}
							}
						}
					});
				}
				else {
					/* do a clean move by returning a swap object without a swapItem */
					var swapArray = _.map(sourceBucket, function(item){
						var ownerBucket = _.where( item.character.items(), { bucketType: key });
						var ownerIcon = item.character.icon().replace("url(",'').replace(')','');
						if ( ownerBucket.length == 1 ){
							return {
								description: item.description + " will not be moved. There is no item to replace it.",
								targetIcon: item.icon,
								actionIcon: "assets/cant-transfer.png",
								swapIcon: ownerIcon
							}
						}
						/* if the item is already in the targetBucket */
						if ( _.findWhere( targetBucket, { _id: item._id }) ){
							/* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
							if ( item.doEquip() == true ){
								return {
									targetItem: item,
									description: item.description + " will be equipped.",
									actionIcon: "assets/to-equip.png",
									swapIcon: targetCharacterIcon
								}
							}
							/* then return an object indicating to do nothing */
							else {
								return {
									description: item.description + " is already in the " + targetCharacter.classType + "'s bucket of " + item.bucketType,
									targetIcon: item.icon,
									actionIcon: "assets/no-transfer.png",
									swapIcon: ownerIcon
								}
							}
						}
						else if ( item.bucketType == "Subclasses" || ( item.armorIndex != -1 && item.character.classType != targetCharacter.classType )) {
							return {
								description: item.description + " will not be moved",
								targetIcon: item.icon,
								actionIcon: "assets/no-transfer.png",
								swapIcon: ownerIcon
							}
						}
						else {
							if ( item.doEquip() == true ){
								return {
									targetItem: item,
									description: item.description + " will be moved and equipped.",
									actionIcon: "assets/to-equip.png",
									swapIcon: targetCharacterIcon
								}
							}
							else {							
								return {
									targetItem: item,
									description: item.description + " will be moved",
									actionIcon: "assets/to-transfer.png",
									swapIcon: targetCharacterIcon
								}
							}
						}
					});
				}
				return swapArray;
			}));
		}
		if (masterSwapArray.length > 0){
			var $template = $(swapTemplate({ swapArray: masterSwapArray }));
			//$template.find(".itemImage").bind("error", function(){ this.src = 'assets/panel_blank.png' });
			$template = $template.append($(".progress").clone().wrap('<div>').parent().show().html());
			(new tgd.dialog({buttons:[ 
				{label: "Transfer", action: function(dialog){ self.swapItems(masterSwapArray, targetCharacterId, function(){
					BootstrapDialog.alert("Item(s) transferred successfully <br> If you like this app remember to <a style=\"color:green; cursor:pointer;\" href=\"http://bit.ly/1Jmb4wQ\" target=\"_system\">buy me a beer</a> ;)");
					dialog.close()
				}); }},
				{label: "Cancel", action: function(dialog){ dialog.close() }}
			]})).title("Transfer Confirm").content($template).show(true);
		}
	}
}