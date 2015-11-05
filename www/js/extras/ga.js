/*window.ga_debug = {
    trace: true
};*/

_ga = (function() {
    var self = this;

    this.init = function() {
        var ga_options = {
            'cookieDomain': 'none'
        };

        if (isMobile) {
            ga_options = {
                'storage': 'none',
                'clientId': device.uuid
            };
        }

        ga('create', 'UA-61575166-1', ga_options);
        //Allow tracking in extensions, mobile devices etc
        ga('set', 'checkProtocolTask', function() { /* nothing */ });
        ga('set', 'appVersion', tgd.version);
        ga(function(tracker) {
            // Grab a reference to the default sendHitTask function.
            var originalSendHitTask = tracker.get('sendHitTask');
            // Modifies sendHitTask to send a copy of the request to a local server after
            // sending the normal request to www.google-analytics.com/collect.
            tracker.set('sendHitTask', function(model) {
                originalSendHitTask(model);
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://www.towerghostfordestiny.com/ga.cfm', true);
                xhr.send(model.get('hitPayload'));
            });
        });
        ga('send', 'pageview');
        self.loadListeners();
    };

    this.loadListeners = function() {
        // Track basic JavaScript errors
        window.addEventListener('error', function(e) {
            /* This is a problem I keep seeing in the exception logs let's see where it comes from */
            /*if (e.message.indexOf("Maximum call") > -1) {
                ga('send', 'exception', {
                    'exDescription': e.error.stack,
                    'exFatal': true,
                    'appName': e.message,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        console.log("crash reported");
                    }
                });
            }*/
            /* don't log known issue with InAppBrowser using 0.6.0 supposedly fixed since 0.5.4*/
            if (e.filename.toLowerCase().indexOf("inappbrowser") == -1 && e.filename.toLowerCase().indexOf("cordova") == -1) {
                ga('send', 'exception', {
                    'exDescription': e.message,
                    'exFatal': true,
                    'appName': e.filename + ':  ' + e.lineno,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        console.log("crash reported " + e.message);
                        console.log(e);
                    }
                });
            }
        });
        var unwantedCodes = [0, 503, 504, 522, 524];
        // Track AJAX errors (jQuery API)
        $(document).ajaxError(function(evt, request, settings, err) {
            if (unwantedCodes.indexOf(request.status) == -1) {
                ga('send', 'exception', {
                    'exDescription': request.status + " ajax error at " + settings.url + " " + settings.data + " " + err,
                    'exFatal': true,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        tgd.localLog(request.status + " ajax error at " + settings.url + " " + settings.data + " " + err);
                    }
                });
            } else {
                tgd.localLog(request.status + " ajax error (code 0) at " + settings.url + " " + settings.data + " " + err);
            }
        });
    };
});

if (isMobile) {
    document.addEventListener('deviceready', _ga.init, false);
} else {
    $(document).ready(_ga.init);
}