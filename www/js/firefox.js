window.activeCookie = self.options.token;
window.addEventListener("request-cookie", function(event) {
    console.log("cookie requested");
    self.port.on("response-cookie", function(newValue) {
        window.activeCookie = newValue;
        console.log("new cookie is " + newValue);
    });
    self.port.emit("request-cookie");
});

var apikey = '5cae9cdee67a42848025223b4e61f929';

window.addEventListener("request-message", function(event) {
    try {
        var request = event.detail;
        //console.log("request id is: " + request.id); 
        //console.log("request options are " + JSON.stringify(request.opts));
        var opts = request.opts;
        var xhr = new XMLHttpRequest();
        xhr.open(opts.method, opts.route, true);
        xhr.setRequestHeader('X-API-Key', apikey);
        xhr.setRequestHeader('x-csrf', window.activeCookie);
        xhr.onload = function() {
            var reply = {
                id: request.id,
                "status": xhr.status,
                "response": xhr.response
            };
            window.postMessage(reply, "*");
        };
        xhr.onerror = function() {
                var reply = {
                    id: request.id,
                    "status": xhr.status,
                    "response": xhr.response
                };
                window.postMessage(reply, "*");
            }
            //console.log("setting the request header to " + self.options.token);
        if (opts.payload)
            xhr.send(JSON.stringify(opts.payload));
        else
            xhr.send();
    } catch (e) {
        console.log("try catch error");
        console.log(e.toString());
    }

}, false);