tgd.extrasPopup = function(item) {
    var self = this;

    self.item = item;
    self.characters = app.orderedCharacters;

    var selectedStatus = ko.observable(_.reduce(self.characters(), function(memo, character) {
        memo[character.id] = (character.id !== "Vault");
        return memo;
    }, {}));

    self.total = ko.computed(function() {
        var c = 0;
        for (i = 0; i < self.characters().length; i++) {
            if (selectedStatus[(self.characters()[i]).id] === true) {
                var ct = _.reduce(
                    _.filter(self.characters()[i].items(), {
                        description: self.description
                    }),
                    function(memo, i) {
                        return memo + i.primaryStat();
                    },
                    0);
                c = c + parseInt(ct);
            }
        }
        return c;
    });

    self.selectedCharacters = ko.computed(function() {
        return _.filter(self.characters(), function(c) {
            return selectedStatus()[c.id] === true;
        });
    });

    self.setSelectedCharacter = function() {
        selectedStatus()[this.id] = false;
    }

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    }
}