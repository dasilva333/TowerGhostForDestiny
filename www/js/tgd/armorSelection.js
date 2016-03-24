tgd.ArmorSelection = function(groups) {
    var self = this;

    self.groups = groups;

    self.armorGroups = ko.observableArray(_.map(groups, function(items, bucketType) {
        return new tgd.armorGroup(bucketType, items);
    }));
    self.combinedStatPoints = ko.computed(function() {
        return 10;
    });
    self.statTiers = ko.computed(function() {
        return 10;
    });
    self.statValues = ko.computed(function() {
        return 10;
    });
    self.projectedLightLevel = ko.computed(function() {
        return 10;
    });
    self.currentLightLevel = ko.computed(function() {
        return 10;
    });
}

tgd.armorGroup = function(bucketType, items) {
    var self = this;

    self.bucketType = bucketType;

	var selectedIndex = 0;
	
    self.items = _.map(items, function(item, index) {
        return new tgd.armorItem(item, index == selectedIndex);
    });

    self.selectedItem = ko.observable(self.items[selectedIndex]);

}

tgd.armorItem = function(item, isSelected) {
    var self = this
    _.extend(self, item);
	var isSelected = ko.observable(isSelected);
    self.css = ko.computed(function() {
        return isSelected() ? "selected" : "not-selected";
    });
}