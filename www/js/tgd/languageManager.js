tgd.languageManager = function(currentLocale, languages) {
    var self = this;

    self.currentLocale = currentLocale;

    self.languages = languages;

    self.setLanguage = function(model, event) {
        app.appLocale(this.code);
        app.autoUpdates(true);
        tgd.checkUpdates();
        BootstrapDialog.alert("Downloading updated language files");
    }
}