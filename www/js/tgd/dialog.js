tgd.koDialog = function(options) {
    var dialog = new tgd.dialog(options);
    var id = new Date().getTime();
    var mdl = dialog.modal;
    var hasTemplate = options.templateName && options.templateName != "";
    if (hasTemplate) {
        var template = tgd[options.templateName]({
            id: id
        });
        mdl.setMessage(template);
    }
    mdl.onHide(function() {
        if (options.onFinish) {
            $(document).unbind("keyup.dialog");
        }
        if (hasTemplate) {
            ko.cleanNode(document.getElementById('container_' + id));
        }
    });
    mdl.onShow(function(instance) {
        var activeModal = instance.getModal();
        activeModal.on("shown.bs.modal", function() {
		    if (options.viewModel && options.viewModel.setDialog) {
		        options.viewModel.setDialog(mdl);
		    }		
            if (options.onFinish) {
                $(document).unbind("keyup.dialog").bind("keyup.dialog", function(e) {
                    var code = e.which;
                    if (code == 13) {
                        options.onFinish(mdl);
                        $(document).unbind("keyup.dialog");
                    }
                });
            }
            if (hasTemplate) {
                ko.applyBindings(options.viewModel, document.getElementById('container_' + id));
            }
        });
    });
    return dialog;
};

tgd.dialog = (function(options) {
    var self = this;

    this.modal = new BootstrapDialog(options);
    this.modal.setSize(BootstrapDialog.SIZE_WIDE);
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