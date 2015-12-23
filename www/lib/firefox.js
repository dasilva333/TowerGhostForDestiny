window.addEventListener("request-cookie-from-ps", function(event) {
    //console.log("received request-cookie-from-ps");
    self.port.on("response-cookie-from-as", function(newValue) {
        var cloned = cloneInto(newValue, document.defaultView);
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent("response-cookie-from-cs", true, true, cloned);
        document.documentElement.dispatchEvent(event);
        //console.log("sending out response-cookie-from-cs, got response-cookie-from-as: " + cloned);
    });
    //console.log("sending request-cookie-from-cs");
    self.port.emit("request-cookie-from-cs");
});

window.addEventListener("xhr-request", function(event) {
    var request = event.detail;
    var xhr = new XMLHttpRequest();
    var responseHandler = function() {
        //console.log(xhr.readyState + " state: " + request.url);
        if (xhr.readyState == 4) {
            var fXHR = {
                readyState: 4,
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                id: request.id
            };
            //console.log("onload fired " + request.url);
            var cloned = cloneInto(fXHR, document.defaultView);
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent("xhr-reply", true, true, cloned);
            document.documentElement.dispatchEvent(event);
        }
    };
    //console.log("firefox.js received xhr-request " + request.url);
    xhr.open(request.type, request.url, request.async);
    request.headers.forEach(function(header) {
        xhr.setRequestHeader(header.key, header.value);
        //console.log(header.key + " header: " + header.value);
    });
    xhr.onreadystatechange = responseHandler;
    if (request.payload) {
        xhr.send(request.payload);
    } else {
        xhr.send();
    }
    /*setTimeout(function(){
		if (xhr.readyState != 4){
			xhr.readyState = 4;
			responseHandler();
		}
	}, 30*1000);*/

}, false);

console.log("sending cs-ready");
var event = document.createEvent('CustomEvent');
var cloned = cloneInto({ localPath: self.options.localPath }, document.defaultView);
event.initCustomEvent("cs-ready", true, true, cloned);
document.documentElement.dispatchEvent(event);