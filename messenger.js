'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const redis = require("redis")
const client = redis.createClient(process.env.REDIS_URL)
let sessions = {};

var nodemailer = require('nodemailer');

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport('smtps://sudodev.2016@gmail.com:marcuskohchihao@smtp.gmail.com');

app.set('port', (process.env.PORT || 8080))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static('public'));
// Process application/json
app.use(bodyParser.json())

//redis error logic
client.on('error',function(error){
	console.log("Error while opening the redis connection")
})
//saving 
//client.set('sessions',JSON.stringify(sessions));
//get the key/value pair from redis 
client.get('sessions',function(error,value){

	if(value === null){
		console.log("Setting up sessions");
		client.set("sessions",JSON.stringify(sessions))
	}else {
		sessions = JSON.parse(value) ;
		console.log(sessions)
	}

})
// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})
// to post data
app.post('/webhook/', function (req, res) {
	console.log("triggered")
	let messaging_events = req.body.entry[0].messaging
	
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		console.log(event)
		let sender = event.sender.id
		console.log(sender);
		const sessionId = findOrCreateSession(sender)
		var session = sessions[sessionId]
		console.log("its here")
		if (event.message && event.message.text) {
			console.log("text")
			let text = event.message.text


			console.log(text)
			if(text === "hello world"){
				console.log("Hello World")
			}
			if (session.context.fieldcall==2){			
				session.context.fieldcall = 3
				session.context.email = text  
				sendTextMessage(sender,"Okay, next up. Can i have you phone number? In case i cant contact you via email ")
				client.set("sessions",JSON.stringify(sessions))	
			}else if (session.context.fieldcall ==3){
				session.context.fieldcall = 4 
				session.context.tel = text 
				client.set("sessions",JSON.stringify(sessions))	
				sendTextMessage(sender,"Last step! Please send us an image of your clothing design")
			}
			
		
		}else if (event.postback) {
			
			let payload = event.postback.payload

			switch (payload){
				case "get_started":
					sendInitMessage(sender)
					//sendTextMessage(sender,"Welcome to Anteprints!We are singapore number 1 seller in printed clothes")
					break;

				case "get_a_quotation":
			
					session.context.fieldcall = 1
					sendTextMessage(sender,"Okay. What kind of shirt are you looking for?")
					sendGenericMessage(sender)
					client.set("sessions",JSON.stringify(sessions))
					break;

				case "locate_us":
					sendTextMessage(sender,"Hello! We are located @ 1 Turf Club Avenue KF1 Karting Circuit S738078 \n https://www.google.com.sg/maps?q=Singapore+738078&um=1&ie=UTF-8&sa=X&ved=0ahUKEwjW8fiYqorRAhUKpI8KHbBZDScQ_AUICCgB")
					break;

				case "Polo Tee":
					sendTextMessage(sender,"Great choice in selecting " + payload)
					session.context.selected_clothes=payload
					if(session.context.fieldcall== 1){
						session.context.fieldcall = 2
						sendTextMessage(sender,"Alright! What is your email address?")
						client.set("sessions",JSON.stringify(sessions))			
					}
					break;

				case "Dry Fit": 
					sendTextMessage(sender,"Great choice in selecting " + payload)
					session.context.selected_clothes=payload
					if(session.context.fieldcall== 1){
						session.context.fieldcall = 2
						sendTextMessage(sender,"Alright! What is your email address?")
						client.set("sessions",JSON.stringify(sessions))			
					}
					break;

				case "Jacket": 
					sendTextMessage(sender,"Great choice in selecting " + payload)
					session.context.selected_clothes=payload
					if(session.context.fieldcall== 1){
						session.context.fieldcall = 2
						sendTextMessage(sender,"Alright! What is your email address?")
						client.set("sessions",JSON.stringify(sessions))			
					}
					console.log(session.context.fieldcall)
					break;

				case "Gildan":
					sendTextMessage(sender,"Great choice in selecting " + payload)
					session.context.selected_clothes=payload
					if(session.context.fieldcall== 1){
						session.context.fieldcall = 2
						sendTextMessage(sender,"Alright! What is your email address?")
						client.set("sessions",JSON.stringify(sessions))			
					}
					break;

			}

			console.log("work here")
			
		} else if(event.delivery){
			console.log("delivered")

		} else if (event.message.attachments) {
			console.log("idk why isit coming here...")
    		//Checking if there are any image attachments 
    		if(event.message.attachments[0].type === "image"){
    			console.log("images")
     			var imageURL = event.message.attachments[0].payload.url;
     			console.log(imageURL);
     			console.log(session.context.fieldcall)
     			if (session.context.fieldcall==4){
					session.context.fieldcall = 5
					
					sendTextMessage(sender,"Thanks! We will contact you soon 😉")
					client.set("sessions",JSON.stringify(sessions))	
					console.log(session.context.selected_clothes+","+session.context.email+","+session.context.tel)
					sendEmail(sender,session.context.selected_clothes,session.context.email,session.context.tel)
					
				}
    		}

    		
   		}
	}
	res.sendStatus(200)
})

function sendEmail(sender,selected_clothes,email,tel){
	//get user's name 
	var _url = "https://graph.facebook.com/v2.6/"+sender+"?fields=first_name,last_name&access_token="+process.env.PAGE_ACCESS_TOKEN
	var name=""
	request({
		url: _url
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else if (!error && response.statusCode == 200){
			name = body.first_name + " " + body.last_name
		}
	})
	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: '"Fred Foo 👥" <foo@blurdybloop.com>', // sender address
	    to: 'chihao07@hotmail.com', // list of receivers
	    subject: 'New Clothings Deals😘', // Subject line
	    html: 'Name: '+name
	    + '\nCategory: ' + selected_clothes
	    + '\nEmail: ' + email
	    + '\nTel: ' + tel + '\n'
	    +'<img src="https://scontent-sit4-1.xx.fbcdn.net/v/t35.0-12/15658636_10155427683114881_2065903959_o.jpg?oh=c5100d29a2c86d32267c3cac13a8b7ab&oe=585F53FF"/>'
	};

	transporter.sendMail(mailOptions, function(error, info){
    if(error){
        return console.log(error);
    }
    	console.log('Message sent: ' + info.response);
	});
}




function findOrCreateSession (fbid){
  let sessionId;

  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
    //save sessions
    client.set('sessions',JSON.stringify(sessions));
  }
  return sessionId;
};

// recommended to inject access tokens as environmental variables, e.g.
const token = process.env.PAGE_ACCESS_TOKEN

function sendTextMessage(sender, text) {
	let messageData = { "text":text 
	}
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendImage(sender,path){
	let messageData = {
			"attachment":{
				"type":"image",
				"payload":{
					"url":"http://14ba073f.ngrok.io/images/cat.jpg"
				}
			}
	}

	

	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendTextMessageQuickReply(sender, text,quick_reply) {
	let messageData = { "text":text ,
		"quick_replies":[
		{
			"content_type": "text",
			"title": "Polo T",
			"payload": "Polo T"
		},{
			"content_type": "text",
			"title": "Dry Fit",
			"payload": "Dry Fit"
		},{
			"content_type": "text",
			"title": "Jacket",
			"payload": "Jacket"
		},{
			"content_type": "text",
			"title": "Gildan",
			"payload": "Gildan"
		}]
	}
	
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendInitMessage(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "Anteprints - Clothes Printing Company",
					"subtitle": "Welcome to Anteprints Bot! We can help you with your needs:)",
					"image_url": "http://www.anteprints.com/wp-content/uploads/2015/05/unnamed-2.png",
					"buttons": [{
						"type": "web_url",
						"url": "http://www.anteprints.com",
						"title": "Visit Website"
					}, {
						"type": "postback",
						"title": "Get Quotation",
						"payload": "get_a_quotation"
					},{
						"type": "web_url",
						"url": "https://www.google.com.sg/maps/place/Singapore+738078/@1.422209,103.7600773,17z/data=!3m1!4b1!4m5!3m4!1s0x31da123829d3075f:0x39e2755631b3ca6!8m2!3d1.422209!4d103.762266",
						"title": "Locate Us"
					}]
				
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendGenericMessage(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "Polo Tee",
					"subtitle": "Smart & Comfortable",
					"image_url": "http://www.anteprints.com/wp-content/uploads/2016/05/TLC_-HANGING_Polo_Edit-2.jpg",
					"buttons": [{
						"type": "web_url",
						"url": "http://www.anteprints.com/index.php/polo-shirts/",
						"title": "View Website"
					}, {
						"type": "postback",
						"title": "Select this",
						"payload": "Polo Tee"
					}],
				}, {
					"title": "Dry Fit",
					"subtitle": "Airy & Comfortable",
					"image_url": "http://www.dickssportinggoods.com/graphics/product_images/pDSP1-7488636v750.jpg",
					"buttons": [{
						"type": "web_url",
						"url": "http://www.anteprints.com/",
						"title": "View Website"
					}, {
						"type": "postback",
						"title": "Select this",
						"payload": "Dry Fit",
					}],
				}, {
					"title": "Jacket",
					"subtitle": "Warm & Snuggly",
					"image_url": "https://s-media-cache-ak0.pinimg.com/originals/b8/e0/1b/b8e01b1fbaac93fd20d262a55e476397.jpg",
					"buttons": [{
						"type": "web_url",
						"url": "http://www.anteprints.com/",
						"title": "View Website"
					}, {
						"type": "postback",
						"title": "Select this",
						"payload": "Jacket",
					}],
				}, {
					"title": "Gildan",
					"subtitle": "Most comfortable ever",
					"image_url": "https://www.customink.com/mms/images/catalog/styles/4600/catalog_detail_image_large.jpg",
					"buttons": [{
						"type": "web_url",
						"url": "http://www.anteprints.com/",
						"title": "View Website"
					}, {
						"type": "postback",
						"title": "Select this",
						"payload": "Gildan",
					}],
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})