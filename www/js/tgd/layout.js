tgd.Layout = function(layout) {
    var self = this;

    self.name = layout.name;
    self.id = layout.view;
    self.bucketTypes = layout.bucketTypes;
    self.headerText = layout.headerText;
    self.array = layout.array;
    self.counts = layout.counts;
    self.countText = function(character) {
        return ko.pureComputed(function() {
            var text = "";
            if (self.array !== "" && character.id == 'Vault') {
                var currentAmount = character[self.array]().length;
                var totalAmount = character.id == 'Vault' ? self.counts[0] : self.counts[1];
                text = "(" + currentAmount + "/" + totalAmount + ")";
                if (currentAmount == totalAmount) {
                    text = "<label class='label label-danger'>" + text + "</label>";
                }
            }
            return text;
        });
    };
    self.isVisible = function(character) {
        return ko.pureComputed(function() {
            return (character.id == "Vault" && self.name !== "Post Master") || character.id !== "Vault";
        });
    };
};