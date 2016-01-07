var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        var ref = window.open('https://www.bungie.net/en/User/SignIn/Wlid', '_blank', 'location=yes');
        var loop, cookie;
        ref.addEventListener('loadstop', function(event) {
            clearInterval(loop);
            loop = setInterval(function() {
                ref.executeScript({
                    code: 'document.cookie'
                }, function(result) {
                    //alert('received: ' + result);
                    cookie = result;
                });
            }, 500);
        });
        ref.addEventListener('loadstart', function(event) {
            clearInterval(loop);
        });
        ref.addEventListener('exit', function() {
            alert("final result is " + cookie);
        });
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};