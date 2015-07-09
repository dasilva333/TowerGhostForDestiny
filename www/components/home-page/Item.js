define(['knockout', "underscore", "jquery", "./components/home-page/filters"], function(ko, _, $, filters){

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
			var self = this;
			var searchFilter = filters.searchKeyword() == '' || self.hasPerkSearch(filters.searchKeyword()) ||
				(filters.searchKeyword() !== "" && self.description.toLowerCase().indexOf(filters.searchKeyword().toLowerCase()) > -1);
			var dmgFilter = filters.dmgFilter().length == 0 || filters.dmgFilter().indexOf(self.damageTypeName) > -1;
			var setFilter = filters.setFilter().length == 0 || filters.setFilter().indexOf(self.id) > -1;
			var tierFilter = filters.tierFilter() == 0 || filters.tierFilter() == self.tierType;
			var progressFilter = filters.progressFilter() == 0 || self.hashProgress(filters.progressFilter());
			var typeFilter = filters.typeFilter() == 0 || filters.typeFilter() == self.type;
			var dupes = _.filter(filters.duplicates(), function(id) {
				return id == self.id
			}).length;
			var showDuplicate = filters.showDuplicate() == false || (filters.showDuplicate() == true && dupes > 1);
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
		}
	}
	return Item;
});	