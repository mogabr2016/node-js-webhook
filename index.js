const express = require('express');
const body_parser = require('body-parser');
const axios = require('axios');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
require('dotenv').config();


const app = express().use(body_parser.json());
const server = createServer(app);
const io = new Server(server);

app.listen(process.env.PORT, ()=>{
console.log('webhook is listening');
});

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;

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
           let from = body_param.entry[0].changes[0].value.messages[0].from;
           let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;
           
                  console.log("phone number" + phone_number_id);
                  console.log("from:" + from);
                  console.log("body param" + msg_body);



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
io.on('connection', (socket) => {
    console.log('a user connected');
  });
  server.listen(3000, () => {
    console.log('server running at' + process.env.PORT);
  });
  
    
