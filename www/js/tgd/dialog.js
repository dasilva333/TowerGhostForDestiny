tgd.dialog = (function(options) {
    var self = this;

    this.modal = new BootstrapDialog(options);
    this.options = options;

    return self;
});

tgd.dialog.prototype = {
    title: function(title) {
        this.modal.setTitle(title);
        return this;
    },

    content: function(content) {
        this.modal.setMessage(content);
        return this;
    },

    buttons: function(buttons) {
        this.modal.setClosable(true).enableButtons(true).setData("buttons", buttons);
        return this;
    },

    show: function(excludeClick, onHide, onShown) {
        var self = this;
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
    }
};