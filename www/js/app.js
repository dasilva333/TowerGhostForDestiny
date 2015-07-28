var app = new(function() {
    var self = this;

    this.init = function() {
		$.ajaxSetup({
			xhr: function(){
				return firefoxXHR();
				return jQuery.ajaxSettings.xhr();
			},
		});
		setTimeout(function(){
			$.ajax({
				url: "https://www.bungie.net",
				type: "POST",
				headers: {
					foo: 'bar'
				},
				data: JSON.stringify({
					foo: 'baz'
				}),
				success: function(result){
					console.log("success is called");
					$("#result").html(result);
				}
			});
		},5000);
		setTimeout(function(){
			$.ajax({
				url: "https://www.bungie.net/en-us/View/Bungie/terms",
				type: "get",
				success: function(result){
					console.log("success is called");
					$("#result").html(result);
				}
			});
		},15000);
    }
});

$(document).ready(app.init);