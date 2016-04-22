tgd.selectMultiCharacters = function(description, characters) {
    var self = this;

    self.description = description;
    self.characters = characters;

    var selectedStatus = ko.observable(_.reduce(self.characters(), function(memo, character) {
        memo[character.id] = (character.id !== "Vault");
        return memo;
    }, {}));

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
}