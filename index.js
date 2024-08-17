const express = require('express');
const body_parser = require('body-parser');
const axios = require('axios');
//const { createServer } = require('node:http');
const http = require('http');
const app = express().use(body_parser.json());
const WebSocket = require('ws');

const { join } = require('node:path');
const {Server} = require('socket.io');
require('dotenv').config();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received:', message);
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
const PORT = process.env.PORT || 3000;
server.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});

//const io = socketIo(server);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});


// Example in-memory store for received messages
let receivedMessages = [];
app.listen(process.env.PORT, ()=>{
console.log('webhook is listening');
});

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;

app.get('/',(req,res)=>{
    res.send('WebSocket Server is running');
});

//to verify the callback url from the dashboard - cloud side
app.get('/webhook',(req,res)=>{
   let mode = req.query['hub.mode'];
   let challenge = req.query['hub.challenge'];
   let token = req.query['hub.verify_token'];


   if (mode && token) {
    if(mode==='subscribe'&&token===mytoken){
        res.status(200).send(challenge);
    }else{
        res.status(403);
    }
   }
});

app.post("/webhook",(req,res)=>{
    let body_param = req.body;
    console.log(JSON.stringify(body_param,null,2));

    if (body_param.object) {
       console.log("Inside body parameter");
        if (body_param.entry &&
            body_param.entry[0].changes[0].value.messages&&
            body_param.entry[0].changes[0].value.messages[0]) {

           let phone_number_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
           let display_phone_number = body_param.entry[0].changes[0].value.metadata.display_phone_number;
           let fromname = body_param.entry[0].changes[0].value.contacts[0].profile.name;
           let from = body_param.entry[0].changes[0].value.messages[0].from;
           let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;
           
                  console.log("phone number ID" + phone_number_id);
                  console.log("My Phone Number: " + display_phone_number);
                  console.log("from:" + from);
                  console.log("from Name:" + fromname);
                  console.log("body param" + msg_body);


    const msg = {
        from : from,
        body : msg_body,
        phone_number_id: phone_number_id
    }

    receivedMessages.push(msg);



        // Log the components of receivedMessages
        console.log("Received Messages: ");
        receivedMessages.forEach((msg, index) => {
            console.log(`Message ${index + 1}:`);
            console.log(`From: ${msg.from}`);
            console.log(`Body: ${msg.body}`);
            console.log(`Phone Number: ${msg.phone_number_id}`);
            console.log('-------------------------');
        });
                // Emit the received messages to connected clients
                io.emit('newMessage', receivedMessages);

           axios({
            method: 'post',
            url: 'https://graph.facebook.com/v20.0/'+phone_number_id+'/messages?access_token=' + token,
            data: {
                messaging_product: "whatsapp",
                to: from,
                text:{
                    body: "Hi, I'm a trial message"
                }
            },
            headers: {
                "Content-Type": "application/json"
            }
           });

           res.sendStatus(200);
        }else{
            res.sendStatus(404);
        }
    }
});

  
    
