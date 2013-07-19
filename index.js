var restify = require('restify'),
	gm = require('googlemaps');
	redis = require("redis"),
	client = redis.createClient(6379,process.env.redisserver);

var server = restify.createServer({
	name: 'Citybreak.DistanceLookup',
	version: '1.0.0'
});

client.on("error", function (err) {
	console.log("Error " + err);
});

client.select(10);

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var respond = function(from,to,req,res,next) {
	var redisKey = "dist:" + from + ":" + to;

	client.get(redisKey, function(err,data) {
		if(err) {
			console.log("err");
			res.send(err);
		} else {
			if(data === null) {
				console.log("Not cached");
					gm.distance(from,to,function (err, data) {
							if(err) {
								res.send(err);
							} else {
								client.set(redisKey,JSON.stringify(data), function(err,data) {
									client.expire(redisKey,60 * 60 * 24 * 1);
								})
								res.send(data);
							}
							return next();
					});
			} else {
				console.log("Got from cache");
				res.setHeader("Content-Type", "application/json");
				res.write(data);
				res.end();
				return next();
			}
		}
	});
};

server.get('/distance/from/:flat/:flon/to/:tlat/:tlon', function (req, res, next) {
	var from = req.params.flat + "," + req.params.flon;
	var to = req.params.tlat + "," + req.params.tlon;
	respond(from,to,req,res,next);
});

server.get('/distance/from/:from/to/:to', function (req, res, next) {
	respond(req.params.from,req.params.to,req,res,next);
});

server.listen(4242, function () {
	console.log('%s listening at %s', server.name, server.url);
});