	
/*
targetItem: item,
swapItem: swapItem,
description: item.description + "'s swap item is " + swapItem.description
*/
var swapTemplate3 = _.template('<ul class="list-group">' +	
	'<% swapArray.forEach(function(pair){ %>' +
		'<li class="list-group-item">' +
			'<div class="row">' +
				'<div class="col-xs-12 col-sm-12 col-md-12 col-lg-6">' +
					'<%= pair.description %>' +
				'</div>' +
				'<div class="col-xs-6 col-sm-6 col-md-6 col-lg-3">' +
					'<a class="item" href="<%= pair.targetItem && pair.targetItem.href %>" id="<%= pair.targetItem && pair.targetItem._id %>">' + 
						'<img class="itemImage" src="<%= pair.targetItem && pair.targetItem.icon %>">' +
					'</a>' +
				'</div>' +
				'<div class="col-xs-6 col-sm-6 col-md-6 col-lg-3">' +
					'<a class="item" href="<%= pair.swapItem && pair.swapItem.href %>" id="<%= pair.swapItem && pair.swapItem._id %>">' + 
						'<img class="itemImage" src="<%= pair.swapItem && pair.swapItem.icon %>">' +
					'</a>' +
				'</div>' +
			'</div>' +
		'</li>' +
	'<% }) %>' +
'</ul>');

var Loadout = function(model){
	var self = this;
	
	_.each(model, function(value, key){
		self[key] = value;
	});	
	this.name = self.name || "";
	this.ids = ko.observableArray(self.ids || []);
	this.equipIds = ko.observableArray(self.equipIds || []);
	this.setActive = function(){
		app.loadoutMode(true);
		app.activeLoadout(self);
	}
	this.remove = function(){
		app.loadouts.remove(self);
		app.createLoadout();
		app.saveLoadouts();
	}

	this.save = function(){
		var ref = _.findWhere( app.loadouts(), { name: self.name });
		if ( ref ){
			app.loadouts.splice(app.loadouts().indexOf(ref),1);
		}
		app.loadouts.push( self );
		app.saveLoadouts();
	}
	this.bindEquipIds = function(instanceId){
		return ko.computed(function(){
			return _.where( self.equipIds() , { _id: instanceId }).length > 0;
		});
	}
	this.markAsEquip = function(item){
		var existingItem = _.where( self.equipIds(), { bucketType: item.bucketType });
		if ( existingItem.length > 0 ){
			self.equipIds.remove(existingItem[0]);
		}
		self.equipIds.push({ bucketType: item.bucketType, _id: item._id });
		return true;
	}	
	this.items = ko.computed(function(){
		var _items = [];
		_.each(self.ids(), function(instanceId){
			var itemFound;
			app.characters().forEach(function(character){
				var match = _.findWhere(character.items() , { _id: instanceId });
				if (match) itemFound = match;
			});
			if(itemFound){
				itemFound.doEquip = self.bindEquipIds(itemFound._id);
				itemFound.markAsEquip = self.markAsEquip;
				_items.push(itemFound);
			}
			else {
				self.ids.remove(instanceId);
			}
		});	
		return _items;
	});

	/* the object with the .store function has to be the one in app.characters not this copy */
	this.findReference = function(item){
		var c = _.findWhere(app.characters(),{ id: item.character.id });
		var x = _.findWhere(c.items(),{ _id: item._id });
		return x;
	}
	this.swapItems = function(swapArray, targetCharacterId, callback){
		var itemIndex = -1, increments = parseInt(90 / swapArray.length), progressValue = 10;
		var loader = $(".bootstrap-dialog-message .progress").show().find(".progress-bar").width( progressValue + "%");
		var transferNextItem = function(){
			//console.log("transferNextItem");
			var pair = swapArray[++itemIndex];
			if (pair){
				/* at this point it doesn't matter who goes first but lets transfer the loadout first */				
				if ( typeof pair.targetItem !== "undefined"){
					var owner = pair.targetItem.character.id;					
					var action = (_.where( self.equipIds(), { _id: pair.targetItem._id }).length == 0) ? "store" : "equip";
					//console.log("going to " + action + " first item " + pair.targetItem.description);
					progressValue = progressValue + (increments / 2);
					loader.width( progressValue + "%" );
					self.findReference(pair.targetItem)[action](targetCharacterId, function(){			
						//console.log("xfered it, now to transfer next item " + pair.swapItem.description);
						if (typeof pair.swapItem !== "undefined"){
							self.findReference(pair.swapItem).store(owner, function(){
								progressValue = progressValue + (increments / 2);
								loader.width( progressValue + "%" );
								transferNextItem();
							});
						}	
						else { 
							progressValue = progressValue + increments;
							loader.width( progressValue + "%" );
							transferNextItem();
						}
					}, true);
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
	}
	/* before starting the transfer we need to decide what strategy we are going to use */
	/* strategy one involves simply moving the items across assuming enough space to fit in both without having to move other things */
	/* strategy two involves looking into the target bucket and creating pairs for an item that will be removed for it */
	/* strategy three is the same as strategy one except nothing will be moved bc it's already at the destination */
	this.transfer = function(targetCharacterId){
		//try {
			var targetCharacter = _.findWhere( app.characters(), { id: targetCharacterId });
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
							/* if the item is already in the targetBucket */
							if ( _.findWhere( targetBucket, { _id: item._id }) ){
								/* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
								if ( _.where(self.equipIds(), { _id: item._id }).length > 0 ){
									return {
										targetItem: item,
										description: item.description + " will be just be equipped."
									}
								}
								/* then return an object indicating to do nothing */
								else {
									return {
										description: item.description + " is already in the " + targetCharacter.classType + "'s bucket of " + item.bucketType
									}
								}								
							}
							else {
								var itemFound = false;
								var swapItem = _.filter(_.where(targetBucket, { type: item.type }), getFirstItem(sourceBucketIds, itemFound));
								swapItem = (swapItem.length > 0) ? swapItem[0] : _.filter(targetBucket, getFirstItem(sourceBucketIds, itemFound))[0];
								//console.log("found swap item " + swapItem.description);
								if ( swapItem ){								
									return {
										targetItem: item,
										swapItem: swapItem,
										description: item.description + " will be swapped with " + swapItem.description
									}
								}	
								else {								
									return {
										targetItem: item,
										description: item.description + " will just be moved"
									}	
								}							
							}
						});						
					}
					else {
						/* do a clean move by returning a swap object without a swapItem */
						var swapArray = _.map(sourceBucket, function(item){
							/* if the item is already in the targetBucket */
							if ( _.findWhere( targetBucket, { _id: item._id }) ){
								/* if the item is currently part of the character but it's marked as to be equipped than return the targetItem */
								if ( _.where(self.equipIds(), { _id: item._id }).length > 0 ){
									return {
										targetItem: item,
										description: item.description + " will be just be equipped."
									}
								}
								/* then return an object indicating to do nothing */
								else {
									return {
										description: item.description + " is already in the " + targetCharacter.classType + "'s bucket of " + item.bucketType
									}
								}								
							}
							else if ( item.bucketType == "Subclasses" ){							
								return {
									description: item.description + " will not be moved"
								}
							}
							else {
								return {
									targetItem: item,
									description: item.description + " will be just be moved"
								}
							}
						});
					}
					return swapArray;
				}));
			}
			if (masterSwapArray.length > 0){
				var $template = $(swapTemplate3({ swapArray: masterSwapArray }));
				$template.find(".itemImage").bind("error", function(){ this.src = 'assets/panel_blank.png' });
				$template = $template.append($(".progress").clone().wrap('<div>').parent().show().html());
				(new dialog({buttons:[ 
					{label: "Transfer", action: function(dialog){ self.swapItems(masterSwapArray, targetCharacterId, function(){
						BootstrapDialog.alert("Item(s) transferred successfully <br> If you like this app remember to <a style=\"color:green; cursor:pointer;\" href=\"http://bit.ly/1Jmb4wQ\" target=\"_blank\">buy me a beer</a> ;)");
						dialog.close()
					}); }},
					{label: "Cancel", action: function(dialog){ dialog.close() }}
				]})).title("Transfer Confirm").content($template).show();
				
			}		
		//}catch(e){
			//console.log(e.toString());
		//}		
	}
}

Loadout.prototype.toJSON = function(){
    var copy = ko.toJS(this); //easy way to get a clean copy
	//copy.items = _.pluck(copy.items, '_id'); //strip out items metadata
	delete copy.items;
	return copy;
}