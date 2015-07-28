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
	console.log("firefox.js received xhr-request");		
	var request = event.detail;
	var xhr = new XMLHttpRequest();
	var responseHandler = function() {
		var fXHR = {
			readyState: 4,
			status: xhr.status,
			statusText: xhr.statusText,
			responseText: xhr.responseText
		};
		console.log("onload fired " + request.url);
		var cloned = cloneInto(fXHR, document.defaultView);
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent("xhr-reply", true, true, cloned);
		document.documentElement.dispatchEvent(event);
	};	
	xhr.open(request.type, request.url, request.async);
	request.headers.forEach(function(header){
		xhr.setRequestHeader(header.key, header.value);
	});
	xhr.onload = responseHandler;
	xhr.onerror = responseHandler;
	if (request.payload){
		xhr.send(request.payload);
	}
	else {
		xhr.send();
	}	

}, false);