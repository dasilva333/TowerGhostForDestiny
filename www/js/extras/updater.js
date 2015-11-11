(function() {

    tgd.localLog("checking for updates");

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
        persistent: isCordova, // Chrome should use temporary storage.
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
            message: "Checking for updates"
        });
        tgd.loader.check()
            .then(function() {
                $.toaster({
                    priority: 'info',
                    title: 'Info',
                    message: "Downloading updates"
                });
                return tgd.loader.download();
            })
            .then(function() {
                $.toaster({
                    priority: 'info',
                    title: 'Info',
                    message: "Installing updates"
                });
                return tgd.loader.update();
            }, function(err) {
                $.toaster({
                    priority: 'danger',
                    title: 'Error',
                    message: 'Auto-update error:' + err
                });
            });
    };
})();