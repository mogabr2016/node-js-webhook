const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const body_parser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
// Initialize Supabase client
const supabaseUrl = 'https://ujxkhyygciuafegwzmvr.supabase.co'; // replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeGtoeXlnY2l1YWZlZ3d6bXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg3NTUzNDIsImV4cCI6MjAyNDMzMTM0Mn0.jr_BGXpuKY7rsTQXI2KQ3rDdA0aeFbusqvX6pdw2ot4'; // replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);


const app = express().use(body_parser.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const axios = require('axios');

async function getOrCreateConversationId(conversationId) {
  try {
    // Try to find an existing conversation with this contact ID
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .single();

    if (findError && findError.code !== 'PGRST100') { // Handle error if it's not a 'not found' error
      console.error('Error finding conversation:', findError);
      throw new Error('Error finding conversation');
    }

    // If conversation exists, return its ID
    if (existingConversation) {
      return existingConversation.id;
    }

    // If no conversation exists, create a new one
    const { data: newConversation, error: insertError } = await supabase
      .from('conversations')
      .insert([{ conversation_id: conversationId, updated_at: new Date().toISOString() }])
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating conversation:', insertError);
      throw new Error('Error creating conversation');
    }

    return newConversation.id;
  } catch (error) {
    console.error('Error in getOrCreateConversationId:', error);
  }
}

// Function to handle a new message
async function handleNewMessage(contactId, message) {
  try {
    // Get or create the conversation ID
    const conversationId = await getOrCreateConversationId(contactId);

    // Insert the new message
    const { data: insertedMessage, error: messageError } = await supabase
      .from('messages2')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: message.from,
          text: message.text,
          timestamp: message.wa_timestamp,
        }
      ]);

    if (messageError) {
      console.error('Error inserting message:', messageError);
      throw new Error('Error inserting message');
    }

    // Update the 'updated_at' field in the conversation
    const { data: updatedConversation, error: conversationError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      throw new Error('Error updating conversation');
    }

  } catch (error) {
    console.error('Error in handleNewMessage:', error);
  }
}


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

//const PORT = process.env.PORT || 3000;
server.listen(3000, () => {
  console.log(`Server is running on port ${3000}`);
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

let receivedMessages = [];
app.listen(8080, ()=>{
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
app.post("/webhook", async (req,res)=>{
    let body_param = req.body;
    console.log(JSON.stringify(body_param,null,2));

    if (body_param.object) {
       console.log("Inside body parameter");
        if (body_param.entry &&
            body_param.entry[0].changes[0].value.messages&&
            body_param.entry[0].changes[0].value.messages[0]) {

           let phone_number_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
           let display_phone_number = body_param.entry[0].changes[0].value.metadata.display_phone_number;
           let message_id = body_param.entry[0].changes[0].value.messages[0].id;
           let numeric_timestamp = body_param.entry[0].changes[0].value.messages[0].timestamp;
           let timestamp = new Date(parseInt(numeric_timestamp) * 1000);
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
const supabaseMessage = {
  from: from,
  to: display_phone_number,
  text: msg_body,
  message_id: message_id,
  wa_timestamp: timestamp
}
    receivedMessages.push(msg);
const contactId = message_id;
          const message = supabaseMessage;
          await handleNewMessage(contactId,message);
try {
    const { error } = await supabase.from('messages').insert(supabaseMessage);
    if (error) {
      console.error('Supabase Insert Error:', error);
      return res.status(500).send('Error storing messages.');
    }

    console.log('Messages stored successfully:', supabaseMessage);
    res.status(200).send('Messages stored successfully.');
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error processing request.');
  }

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
//                io.emit('newMessage', receivedMessages);
  // Broadcast the updated receivedMessages to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(receivedMessages));
    }
  });

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
