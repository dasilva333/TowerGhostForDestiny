define(['knockout', "underscore", "tgd", "Item", "json!./components/destiny-data/raceDefs.js"], function(ko, _, tgd, Item, raceDefs){
	var Profile = function(character, items, bungie) {
		var self = this;

		this.character = character;
		this.bungie = bungie;
		this.order = ko.observable();
		this.icon = ko.observable("");
		this.background = ko.observable("");
		this.items = ko.observableArray([]);
		this.uniqueName = "";
		this.classLetter = "";
		this.race = "";
		
		this.weapons = ko.computed(this._weapons, this);
		this.armor = ko.computed(this._armor, this);
		this.general = ko.computed(this._general, this);
		this.postmaster = ko.computed(this._postmaster, this);
		this.container = ko.observable();
		this.init(items);
	}

	Profile.prototype = {
		init: function(rawItems){
			var self = this;		

			if (_.isString(self.character)){
				self.order(0);
				self.background(self.bungie.makeBackgroundUrl("assets/vault_emblem.jpg", true));
				self.icon(self.bungie.makeBackgroundUrl("assets/vault_icon.jpg", true));
				
				self.gender = "Tower";
				self.classType = "Vault";
				self.id = "Vault";
				self.imgIcon = "assets/vault_icon.jpg";
				
				self.level = "";
				self.stats = "";
				self.percentToNextLevel = "";
				self.race = "";
			}
			else {
				self.background(self.bungie.makeBackgroundUrl(self.character.backgroundPath));
				self.icon(self.bungie.makeBackgroundUrl(self.character.emblemPath));
				
				self.gender= tgd.DestinyGender[self.character.characterBase.genderType];
				self.classType= tgd.DestinyClass[self.character.characterBase.classType];
				self.id= self.character.characterBase.characterId;
				self.imgIcon= self.bungie.getUrl() + self.character.emblemPath;
				
				
				self.level= self.character.characterLevel;
				self.stats= self.character.characterBase.stats;
				self.percentToNextLevel= self.character.percentToNextLevel;
				self.race= raceDefs[self.character.characterBase.raceHash].raceName;
			}
			self.classLetter = self.classType[0].toUpperCase();
			self.uniqueName = self.level + " " + self.race + " " + self.gender + " " + self.classType
			
			self.items(_.map(rawItems, function(item){
				return new Item(item, self);
			}));
		},
		_weapons: function() {
			return _.filter(this.items(), function(item) {
				if (item.weaponIndex > -1)
					return item;
			});
		},
		_armor: function() {
			return _.filter(this.items(), function(item) {
				if (item.armorIndex > -1)
					return item;
			});
		},
		_general: function() {
			return _.filter(this.items(), function(item) {
				if (item.armorIndex == -1 && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Subclasses")
					return item;
			});
		},
		_postmaster: function() {
			return _.filter(this.items(), function(item) {
				if (item.bucketType == "Post Master")
					return item;
			});
		},
		filterItemByType: function(type, isEquipped) {
			return function(item) {
				return (item.bucketType == type && item.isEquipped() == isEquipped);
			}
		},
		get: function(type) {
			return _.sortBy(_.sortBy(this.items().filter(this.filterItemByType(type, false)), function(item) {
				return item.description;
			}), function(item) {
				return item.tierType * -1;
			});
		},
		itemEquipped: function(type) {
			return ko.utils.arrayFirst(this.items(), this.filterItemByType(type, true));
		},
		showStats: function() {
			var character = this;
			if (character && character.stats) {
				var keys = Object.keys(character.stats),
					newStats = [];
				_.each(keys, function(key) {
					var name = key.replace("STAT_", '');
					name = name.substring(0, 1) + name.substring(1, name.length).toLowerCase();
					newStats.push({
						name: name,
						value: character.stats[key].value
					});
				});
				(new tgd.dialog).title("Character Stats").content(tgd.statsTemplate({
					stats: newStats
				})).show();
			}
		}
	}
	return Profile;
});