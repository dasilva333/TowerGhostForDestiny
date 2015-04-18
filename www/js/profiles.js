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
			if (DestinyArmorPieces.indexOf(item.bucketType) == -1 && DestinyWeaponPieces.indexOf(item.bucketType) == -1 && item.bucketType !== "Post Master")
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