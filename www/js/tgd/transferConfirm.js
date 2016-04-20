tgd.transferConfirm = function(item, targetCharacterId, onFinish) {
    var self = this;

    self.characterTotal = 0;
    self.itemTotal = 0;
    self.dialog;
    self.consolidate = ko.observable(false);
    self.materialsAmount = ko.observable(item.primaryStat());

    self.finishTransfer = function(consolidate) {
        if (consolidate) {
            item.consolidate(targetCharacterId, self.description);
            self.dialog.close();
        } else {
            var transferAmount = parseInt(self.materialsAmount());
            if (!isNaN(transferAmount) && (transferAmount > 0) && (transferAmount <= self.characterTotal)) {
				console.log("onFinish", transferAmount);
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
    }

    self.setDialog = function(dialog) {
        self.dialog = dialog;
    }

    self.decrement = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(Math.max(num - 1, 1));
        }
    }

    self.increment = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(Math.min(num + 1, self.characterTotal));
        }
    }

    self.all = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(self.characterTotal);
        }
    }

    self.one = function() {
        var num = parseInt(self.materialsAmount());
        if (!isNaN(num)) {
            self.materialsAmount(1);
        }
    }

    for (i = 0; i < app.orderedCharacters().length; i++) {
        var c = app.orderedCharacters()[i];
        var charTotal = _.reduce(
            _.filter(c.items(), {
                description: item.description
            }),
            function(memo, j) {
                return memo + j.primaryStat();
            },
            0);
        if (item.character == c) {
            self.characterTotal = charTotal;
        }
        self.itemTotal = self.itemTotal + charTotal;
    }
}