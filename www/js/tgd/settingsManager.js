tgd.settingsManager = function(settings) {
    var self = this;

    _.extend(self, settings);

    self.activeLocale = ko.observable(self.currentLocale());

    self.activeLocale.subscribe(function(language_code) {
        self.appLocale(language_code);
        self.autoUpdates(true);
        tgd.checkUpdates();
        BootstrapDialog.alert("Downloading updated language files");
    });
};