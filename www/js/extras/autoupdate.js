(function() {

    // 1. On launch
    //if (!(isChrome || isIOS || isAndroid)) return;

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
    tgd.check = function() {
        console.log("RUNNING CHECK");
        tgd.loader.check()
            .then(function() {
                console.log("RUNNING DOWNLOAD");
                return tgd.loader.download();
            })
            .then(function() {
                console.log("RUNNING UPDATE");
                return tgd.loader.update();
            }, function(err) {
                console.error('Auto-update error:', err);
            });
    }

    // Couple events:
    tgd.check();

    // 2. Cordova: On resume
    fs.deviceready.then(function() {
        document.addEventListener('resume', check);
    });

    // 3. Chrome: On page becomes visible again
    function handleVisibilityChange() {
        if (!document.webkitHidden) {
            tgd.check();
        }
    }
    document.addEventListener("webkitvisibilitychange", handleVisibilityChange, false);
})();