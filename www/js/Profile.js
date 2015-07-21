var Profile = function(model) {
    var self = this;
    _.each(model, function(value, key) {
        self[key] = value;
    });

    this.order = ko.observable(self.order);
    this.icon = ko.observable(self.icon);
    this.background = ko.observable(self.background);
    this.items = ko.observableArray([]);
    this.uniqueName = self.level + " " + self.race + " " + self.gender + " " + self.classType;
    this.classLetter = self.classType[0].toUpperCase();
    this.weapons = ko.computed(this._weapons, this);
    this.armor = ko.computed(this._armor, this);
    this.general = ko.computed(this._general, this);
    this.postmaster = ko.computed(this._postmaster, this);
    this.messages = ko.computed(this._messages, this);
    this.invisible = ko.computed(this._invisible, this);
    this.lostItems = ko.computed(this._lostItems, this);
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
            if (item.armorIndex == -1 && item.weaponIndex == -1 && item.bucketType !== "Post Master" && item.bucketType !== "Messages" && item.bucketType !== "Invisible" && item.bucketType !== "Lost Items" && item.bucketType !== "Subclasses")
                return item;
        });
    },
    _postmaster: function() {
        return _.filter(this.items(), function(item) {
            if ((item.bucketType == "Post Master") || (item.bucketType == "Messages") || (item.bucketType == "Invisible") || (item.bucketType == "Lost Items"))
                return item;
        });
    },
    _messages: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Messages")
                return item;
        });
    },
    _invisible: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Invisible")
                return item;
        });
    },
    _lostItems: function() {
        return _.filter(this.items(), function(item) {
            if (item.bucketType == "Lost Items")
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
    getVisible: function(type) {
        return _.filter(this.get(type), function(item) {
            return item.isVisible();
        });
    },
    itemEquipped: function(type) {
        return ko.utils.arrayFirst(this.items(), this.filterItemByType(type, true));
    },
    itemEquippedVisible: function(type) {
        var ie = this.itemEquipped(type);
        return ie == undefined ? false : ie.isVisible();
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