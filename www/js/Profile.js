var Profile = function(model) {
    var self = this;
    _.each(model, function(value, key) {
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
        return this.items().filter(this.filterItemByType(type, false));
    },
    itemEquipped: function(type) {
        return ko.utils.arrayFirst(this.items(), this.filterItemByType(type, true));
    }
}