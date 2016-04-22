tgd.extrasPopup = function(item) {
    var self = this;

    self.item = item;
    self.characters = app.orderedCharacters;

    var selectedStatus = ko.observable(_.reduce(self.characters(), function(memo, character) {
        memo[character.id] = (character.id !== "Vault");
        return memo;
    }, {}));

    self.total = ko.computed(function() {
        return _.reduce(self.characters(), function(memo, character) {
            var items = _.where(character.items(), {
                description: self.item.description
            });
            memo = memo + _.reduce(items, function(memo, i) {
                return memo + i.primaryStat();
            }, 0);
            return memo;
        }, 0);
    });

    self.selectedCharacters = ko.computed(function() {
        return _.filter(self.characters(), function(c) {
            return selectedStatus()[c.id] === true;
        });
    });

    self.setSelectedCharacter = function() {
        var ss = selectedStatus();
        ss[this.id] = !ss[this.id];
        selectedStatus(ss);
    }

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    }
}