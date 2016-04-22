tgd.transferConfirm = function(item, targetCharacterId, characters, onFinish) {
    var self = this;

	self.itemTotal = _.reduce(characters(), function(memo, character) {
        var items = _.where(character.items(), {
            description: item.description
        });
        memo = memo + _.reduce(items, function(memo, i) {
            return memo + i.primaryStat();
        }, 0);
        return memo;
    }, 0);
	self.characterTotal = _.reduce(_.filter(characters(), function(character){ return item.character.id == character.id;  }), function(memo, character) {
        var items = _.where(character.items(), {
            description: item.description
        });
        memo = memo + _.reduce(items, function(memo, i) {
            return memo + i.primaryStat();
        }, 0);
        return memo;
    }, 0);
    self.dialog = null;
    self.consolidate = ko.observable(false);
    self.materialsAmount = ko.observable(item.primaryStat());

    self.finishTransfer = function(consolidate) {
        if (consolidate) {
            item.consolidate(targetCharacterId, item.description);
            self.dialog.close();
        } else {
            var transferAmount = parseInt(self.materialsAmount());
            if (!isNaN(transferAmount) && (transferAmount > 0) && (transferAmount <= self.characterTotal)) {
                onFinish(transferAmount);
                self.dialog.close();
            } else {
                BootstrapDialog.alert(app.activeText().invalid_transfer_amount + transferAmount);
            }
        }
    };

    self.materialsKeyHandler = function(e) {
        if (e.keyCode == 13) {
            self.finishTransfer(false);
        }
    };

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    };

    self.decrement = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(Math.max(num - 1, 1));
        }
    };

    self.increment = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(Math.min(num + 1, self.characterTotal));
        }
    };

    self.all = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(self.characterTotal);
        }
    };

    self.one = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(1);
        }
    };
};