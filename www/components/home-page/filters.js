define(['knockout', "underscore", "tgd"], function(ko, _, tgd){
	var ItemFilters = function(){
		var self = this;
		
		this.activeView = ko.computed(new tgd.StoreObj("activeView"));
		this.duplicates = ko.observableArray().extend({
            rateLimit: {
                timeout: 5000,
                method: "notifyWhenChangesStop"
            }
        });
		this.searchKeyword = ko.observable(tgd.defaults.searchKeyword);
		this.tierFilter = ko.computed(new tgd.StoreObj("tierFilter"));
		this.typeFilter = ko.observable(tgd.defaults.typeFilter);
		this.dmgFilter = ko.observableArray(tgd.defaults.dmgFilter);
		this.progressFilter = ko.observable(tgd.defaults.progressFilter);
		this.setFilter = ko.observableArray(tgd.defaults.setFilter);
		this.showDuplicate = ko.observable(tgd.defaults.showDuplicate);

		this.toggleBootstrapMenu = function() {
			if ($(".navbar-toggle").is(":visible"))
				$(".navbar-toggle").click();
		}
		this.setView = function(model, event) {
			self.toggleBootstrapMenu();
			self.activeView($(event.target).closest('li').attr("value"));
		}		
		this.setDmgFilter = function(model, event) {
			self.toggleBootstrapMenu();
			var dmgType = $(event.target).closest('li').attr("value");
			self.dmgFilter.indexOf(dmgType) == -1 ? self.dmgFilter.push(dmgType) : self.dmgFilter.remove(dmgType);
		}
		this.setTierFilter = function(model, event) {
			self.toggleBootstrapMenu();
			self.tierFilter(model.tier);
		}
		this.setTypeFilter = function(model, event) {
			self.toggleBootstrapMenu();
			self.typeFilter($(event.target).closest('li').attr("value"));
		}
		this.setProgressFilter = function(model, event) {
			self.toggleBootstrapMenu();
			self.progressFilter($(event.target).closest('li').attr("value"));
		}
	};
	return new ItemFilters();
});