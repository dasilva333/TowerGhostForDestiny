tgd.dialog = (function(options) {
    var self = this;

    this.modal = null;

    this.title = function(title) {
        self.modal = new BootstrapDialog(options);
        self.modal.setTitle(title);
        return self;
    };

    this.content = function(content) {
        self.modal.setMessage(content);
        return self;
    };

    this.buttons = function(buttons) {
        self.modal.setClosable(true).enableButtons(true).setData("buttons", buttons);
        return self;
    };

    this.show = function(excludeClick, onHide, onShown) {
        self.modal.open();
        var mdl = self.modal.getModal();
        if (!excludeClick) {
            mdl.bind("click", function() {
                self.modal.close();
            });
        }
        mdl.on("hide.bs.modal", onHide);
        mdl.on("shown.bs.modal", onShown);
        return self;
    };

    return self.modal;
});