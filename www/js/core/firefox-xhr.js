if (isFirefox) {
    window.ffRequestId = 0;
    window.ffXHRisReady = false;

    window.addEventListener("cs-ready", function(event) {
        window.ffXHRisReady = true;
        tgd.dataDir = event.detail.localPath + 'data';
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

        this.processReply = function(event) {
            var xhr = event.detail;
            if (xhr.id == self.id) {
                tgd.localLog("xhr-reply! " + self.request.url);
                self.readyState = xhr.readyState;
                self.status = xhr.status;
                self.statusText = xhr.statusText;
                self.responseText = xhr.responseText;
                self.onreadystatechange();
                window.removeEventListener("xhr-reply", self.processReply);
            }
        }

        window.addEventListener("xhr-reply", self.processReply, false);
        return self;
    };

    ffXHR.prototype = {
        open: function(type, url, async, username, password) {
            tgd.localLog("opening a new request");
            this.request = {
                id: this.id,
                type: type,
                url: url,
                async: async,
                username: username,
                password: password,
                headers: []
            };
        },
        abort: function() {

        },
        setRequestHeader: function(key, value) {
            this.request.headers.push({
                key: key,
                value: value
            });
        },
        getAllResponseHeaders: function() {
            return "";
        },
        send: function(payload) {
            var self = this;
            var send = function() {
                if (payload)
                    self.request.payload = payload;
                var event = new CustomEvent("xhr-request", {
                    detail: self.request
                });
                window.dispatchEvent(event);
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
        },
        onreadystatechange: function() {
            //console.log("state changed");
        }
    }

    window.XMLHttpRequest = function() {
        return new ffXHR();
    };
    tgd.localLog("init firefox xhr");
}