var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = function(pusherClient, channelName) {
	return new PusherMessenger(pusherClient, channelName);
};

function PusherMessenger(pusherClient, channelName) {
	EventEmitter.call(this); // data, open, close, error

	this.pusher = pusherClient;

	if (!channelName) channelName = "webrtc";
	this.channelName = "private-" + channelName;

	this.pusher.connection.bind('disconnected', apply(this, this.emit, 'close'));
	this.pusher.connection.bind('unavailable', apply(this, this.emit, 'close'));
	this.pusher.connection.bind('failed', apply(this, this.emit, 'error'));

	this.channel = pusherClient.subscribe(this.channelName);
	this.channel.bind('pusher:subscription_succeeded', apply(this, this.emit, 'open'));
	this.channel.bind('pusher:subscription_error', apply(this, this.emit, 'error'));
	this.channel.bind('client-dataline', apply(this, function(data) {
		this.emit('data', data.dataline);
	}));
}
util.inherits(PusherMessenger, EventEmitter);

PusherMessenger.prototype.write = throttle(10, function (dataline) {
	this.channel.trigger('client-dataline', {dataline: dataline});
});

PusherMessenger.prototype.close = function close() {
	this.pusher.unsubscribe(this.channelName);
};


// Utils

var slice = Array.prototype.slice;


function apply(binding, fn /*...args*/) {
	var args = slice.call(arguments, 2);
	return function () {
		return fn.apply(
			binding,
			args.concat(slice.call(arguments))
		);
	};
}


function throttle(num_per_sec, proc) {
	var tid = null, buffer = [];
	return function() {
		var self=this;
		buffer.push(slice.call(arguments));
		if (!tid) {
			tid = setInterval(function() {
				var args = buffer.shift();
				proc.apply(self, args);
				if (buffer.length === 0) {
					clearTimeout(tid);
					tid = null;
				}
			}, 1000 / (num_per_sec - 1));
		}
	};
}
