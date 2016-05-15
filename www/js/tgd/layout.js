tgd.Layout = function(layout) {
    var self = this;

    self.name = layout.name;
    self.id = layout.view;
    self.bucketTypes = layout.bucketTypes;
    self.extras = layout.extras;
    self.headerText = layout.headerText;
    self.array = layout.array;
    self.counts = layout.counts;

    self.activeBucketTypes = ko.computed(self._activeBucketTypes, self);
};

tgd.Layout.prototype = {
    _activeBucketTypes: function() {
        var self = this;
        var bucketTypes = self.bucketTypes;
        if (app.activeView() == "3") {
            bucketTypes = bucketTypes.concat(self.extras);
        }
        return bucketTypes;
    },
    countText: function(character) {
        var self = this;
        return ko.pureComputed(function() {
            var text = "";
            if (self.array !== "" && character.id == 'Vault' && _.has(character, self.array)) {
                var currentAmount = character[self.array]().length;
                var totalAmount = character.id == 'Vault' ? self.counts[0] : self.counts[1];
                text = "(" + currentAmount + "/" + totalAmount + ")";
                if (currentAmount == totalAmount) {
                    text = "<label class='label label-danger'>" + text + "</label>";
                }
            }
            return text;
        });
    },
    titleText: function(character) {
        var self = this;
        return ko.pureComputed(function() {
            return (character.id == 'Vault' && self.name == 'Sub Classes' ? 'Vault Sub Classes' : app.activeText()[self.headerText]);
        });
    },
    isVisible: function(character) {
        var self = this;
        return ko.pureComputed(function() {
            return (character.id == "Vault" && self.name !== "Post Master") || character.id !== "Vault";
        });
    }
};