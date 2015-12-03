if (isFirefox) {
    window.ffRequestId = 0;
    window.ffXHRisReady = false;

    window.addEventListener("cs-ready", function(event) {
        window.ffXHRisReady = true;
    }, false);

    var ffXHR = function() {
        tgd.localLog("creating new ff obj");

        var self = this;

        this.readyState = 1;
        this.status = 500;
        this.statusText = "";
        this.request = {};
        this.id = window.ffRequestId++;
        this.withCredentials = true;

        this.open = function(type, url, async, username, password) {
            tgd.localLog("opening a new request");
            self.request = {
                id: self.id,
                type: type,
                url: url,
                async: async,
                username: username,
                password: password,
                headers: []
            };
        };
        this.abort = function() {

        };
        this.setRequestHeader = function(key, value) {
            self.request.headers.push({
                key: key,
                value: value
            });
        };
        this.getAllResponseHeaders = function() {
            return "";
        };
        this.send = function(payload) {
            var send = function() {
                if (payload)
                    self.request.payload = payload;
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent("xhr-request", true, true, self.request);
                document.documentElement.dispatchEvent(event);
                tgd.localLog("send request to " + self.request.url);
            }
            if (window.ffXHRisReady == true) {
                send();
            } else {
                var check = setInterval(function() {
                    if (window.ffXHRisReady == true) {
                        clearInterval(check);
                        send();
                    }
                }, 1000);
            }
        };
        this.onreadystatechange = function() {
            //console.log("state changed");
        };
        window.addEventListener("xhr-reply", function(event) {
            tgd.localLog("xhr-reply! " + self.request.url);
            var xhr = event.detail;
            if (xhr.id == self.id) {
                self.readyState = xhr.readyState;
                self.status = xhr.status;
                self.statusText = xhr.statusText;
                self.responseText = xhr.responseText;
                self.onreadystatechange();
            }
        }, false);
        return self;
    };

    window.XMLHttpRequest = function() {
        return new ffXHR();
    };;
    tgd.localLog("init firefox xhr");
}