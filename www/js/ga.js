tracking = {
    init: function() {

        //window.ga_debug = {trace: true};

        //Tracking for Universal Analytics
        (function(i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function() {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o),
                m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', 'https://ssl.google-analytics.com/analytics.js', 'ga'); //analytics_debug.js to debug

        ga('create', 'UA-61575166-1', {
            'cookieDomain': 'none'
        });
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

        // Track basic JavaScript errors
        window.addEventListener('error', function(e) {
            /* This is a problem I keep seeing in the exception logs let's see where it comes from */
            if (e.message.indexOf("Maximum call") > -1) {
                ga('send', 'exception', {
                    'exDescription': e.error.stack,
                    'exFatal': true,
                    'appName': e.message,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        console.log("crash reported");
                    }
                });
            }
            /* don't log known issue with InAppBrowser using 0.6.0 supposedly fixed since 0.5.4*/
            if (e.message.indexOf("event.type") == -1) {
                ga('send', 'exception', {
                    'exDescription': e.message,
                    'exFatal': true,
                    'appName': e.filename + ':  ' + e.lineno,
                    'appVersion': tgd.version,
                    'hitCallback': function() {
                        console.log("crash reported");
                    }
                });
            }
        });

        // Track AJAX errors (jQuery API)
        $(document).ajaxError(function(e, request, settings) {
            ga('send', 'exception', {
                'exDescription': e.result,
                'exFatal': true,
                'appName': settings.url,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    console.log("crash reported");
                }
            });
        });

    }
}