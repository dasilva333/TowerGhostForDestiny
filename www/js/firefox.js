/*window.activeCookie = self.options.token;
window.addEventListener("request-cookie", function(event) {
    console.log("cookie requested");
    self.port.on("response-cookie", function(newValue) {
        window.activeCookie = newValue;
        console.log("new cookie is " + newValue);
    });
    self.port.emit("request-cookie");
});
*/

window.addEventListener("xhr-request", function(event) {
    try {
		console.log("firefox.js received xhr-request");
        var request = event.detail;
        var xhr = new XMLHttpRequest();
        xhr.open(request.type, request.url, request.async);
		request.headers.forEach(function(header){
			xhr.setRequestHeader(header.key, header.value);
		});
        xhr.onload = function() {
			var fXHR = {
				readyState: 4,
				status: xhr.status,
				statusText: xhr.statusText,
				responseText: xhr.responseText
			};
            window.postMessage(fXHR, "*");
        };
        xhr.onerror = function() {
			var fXHR = {
				readyState: 4,
				status: xhr.status,
				statusText: xhr.statusText,
				responseText: xhr.responseText
			};
            window.postMessage(fXHR, "*");
		}
        if (request.payload)
            xhr.send(request.payload);
        else
			xhr.send();
    } catch (e) {
        console.log("try catch error");
        console.log(e.toString());
    }

}, false);