(function() {

    tgd.localLog("init auto updates");
    try {

        // Check for Cordova
        var isCordova = typeof cordova !== 'undefined',
            // CordovaPromiseFS
            fs,
            // CordovaFileLoader
            loader,
            // script-tag...
            script,
            // ...that contains the serverRoot
            serverRoot;

        // Get serverRoot from script tag.
        script = document.querySelector('script[server]');
        if (script) serverRoot = script.getAttribute('server');
        if (!serverRoot) {
            throw new Error('Add a "server" attribute to the bootstrap.js script!');
        }

        // Initialize filesystem and loader
        fs = new CordovaPromiseFS({
            persistent: isCordova || isFirefox, // Chrome should use temporary storage.
            Promise: Promise
        });

        tgd.loader = new CordovaAppLoader({
            fs: fs,
            localRoot: 'app',
            serverRoot: serverRoot,
            mode: 'mirror',
            cacheBuster: true
        });

        // Check > Download > Update
        tgd.checkUpdates = function() {
            $.toaster({
                priority: 'info',
                title: 'Info',
                message: "Checking for updates",
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
            tgd.loader.check(serverRoot + "bootstrap.json?locale=" + (localStorage.appLocale || localStorage.locale || "en"))
                .then(function(updateAvailable) {
                    if (updateAvailable) {
                        $.toaster({
                            priority: 'info',
                            title: 'Info',
                            message: "Downloading updates",
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                        tgd.localLog("Downloading auto updates");
                        $("#tgdLoader").show();
                    }
                    return tgd.loader.download(function(progress) {
                        $("#tgdLoaderProgress").width((progress.percentage * 100).toFixed(0) + "%");
                    });
                })
                .catch(function(e) {
                    $("#tgdLoader").hide();
                    $.toaster({
                        priority: 'danger',
                        title: 'Error',
                        message: "Problem checking for updates: " + e.message,
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
                })
                .then(function(manifest) {
                    $("#tgdLoader").hide();
                    if (manifest) {
                        $.toaster({
                            priority: 'info',
                            title: 'Info',
                            message: "Installing updates",
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                    return tgd.loader.update();
                }, function(err) {
                    $("#tgdLoader").hide();
                    $.toaster({
                        priority: 'danger',
                        title: 'Error',
                        message: 'Auto-update error:' + err,
                        settings: {
                            timeout: tgd.defaults.toastTimeout
                        }
                    });
                });
        };

        if (localStorage.autoUpdates == "true" || (tgd.defaults.autoUpdates == "true" && _.isEmpty(localStorage.autoUpdates))) {
            tgd.localLog("Checking for auto updates");
            tgd.checkUpdates();
        }
    } catch (e) {
        tgd.localLog("update crash" + e);
    }
})();