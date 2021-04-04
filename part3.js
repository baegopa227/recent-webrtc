var name,
    connectedUser;

// 영상 저장
var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);

var mediaRecorder;
var recordedBlobs;
var sourceBuffer;
var dataChannel;

var connection = new WebSocket('ws://localhost:8888');

connection.onopen = function () {
  console.log("Socket Connected");
};

// Handle all messages through this callback
connection.onmessage = function (message) {
  console.log("Got message", message.data);

  var data = JSON.parse(message.data);

  switch(data.type) {
    case "login":
      onLogin(data.success);
      break;
    case "offer":
      onOffer(data.offer, data.name);
      break;
    case "answer":
      onAnswer(data.answer);
      break;
    case "candidate":
      onCandidate(data.candidate);
      break;
    case "leave":
      onLeave();
      break;
    default:
      break;
  }
};

connection.onerror = function (err) {
  console.log("Got error", err);
};

// Alias for sending messages in JSON format
function send(message) {
  if (connectedUser) {
    message.name = connectedUser;
  }
//Uncaught DOMException: Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.
  connection.send(JSON.stringify(message));
};

var loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#username'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    optionPage = document.querySelector('#option-page'),
    theirUsernameInput = document.querySelector('#their-username'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up'),
    received = document.querySelector('#received'),
    sendButton = document.querySelector('#send'),
    messageInput = document.querySelector('#message');
callPage.style.display = "none";
optionPage.style.display = "none";

// 영상 저장
var recordButton = document.querySelector('button#record');
var downloadButton = document.querySelector('button#download');

recordButton.onclick = toggleRecording;
downloadButton.onclick = download;



// Bind our text input and received area
sendButton.addEventListener("click", function (event) {
  var val = messageInput.value;
  received.innerHTML += "send: " + val + "<br />";
  received.scrollTop = received.scrollHeight;
  dataChannel.send(val);
});

// Login when the user clicks the button
loginButton.addEventListener("click", function (event) {
  name = usernameInput.value;

  if (name.length > 0) {
    send({
      type: "login",
      name: name
    });
  }
});

function onLogin(success) {
  if (success === false) {
    alert("Login unsuccessful, please try a different name.");
  } else {
    loginPage.style.display = "none";
    callPage.style.display = "block";
    optionPage.style.display = "block";
    // Get the plumbing ready for a call
    startConnection();
  }
};

var yourVideo = document.querySelector('#yours'),
    theirVideo = document.querySelector('#theirs'),
    yourConnection, connectedUser, stream;
    
function startConnection() {
  if (hasUserMedia()) {
    navigator.getUserMedia({ video: true
  , audio: true }, function (stream) {
      //console.log("my stream : " + stream);
      //window.stream1 = stream;
      //window.stream = stream;
      yourVideo.srcObject = stream;
      //yourVideo.srcObject = window.URL.createObjectURL(stream);
      recordButton.disabled = false;
      if (hasRTCPeerConnection()) {
        setupPeerConnection(stream);
      } else {
        alert("Sorry, your browser does not support WebRTC.");
      }
    }, function (error) {
      console.log(error);
    });
  } else {
    alert("Sorry, your browser does not support WebRTC.");
  }
}

function setupPeerConnection(stream) {
  var configuration = {
    "iceServers": [{ "url": "stun:stun01.sipphone.com" }]
  };
  yourConnection = new RTCPeerConnection(configuration);

  // Setup stream listening
  yourConnection.addStream(stream);
  yourConnection.onaddstream = function (e) {
    //console.log("your stream : " + e.stream);
    theirVideo.srcObject = e.stream;
    window.stream = e.stream;  
  };

  // Setup ice handling
  yourConnection.onicecandidate = function (event) {
    if (event.candidate) {
      send({
        type: "candidate",
        candidate: event.candidate
      });
    }
  };
    
  yourConnection.ondatachannel = function(event){
    console.log("function onDataChannel");  
    var channel = event.channel;
    channel.onmessage = function(event){
        received.innerHTML += "recv: " + event.data + "<br />";
        received.scrollTop = received.scrollHeight;
    }
  };
  openDataChannel();
}

function hasUserMedia() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  return !!navigator.getUserMedia;
}

function hasRTCPeerConnection() {
  window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
  window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
  return !!window.RTCPeerConnection;
}

callButton.addEventListener("click", function () {
  var theirUsername = theirUsernameInput.value;

  if (theirUsername.length > 0) {
    startPeerConnection(theirUsername);
  }
});

function startPeerConnection(user) {
  connectedUser = user;

  // Begin the offer
  yourConnection.createOffer(function (offer) {
    send({
      type: "offer",
      offer: offer
    });
    yourConnection.setLocalDescription(offer);
  }, function (error) {
    alert("An error has occurred.");
  });
};

function onOffer(offer, name) {
  connectedUser = name;
  yourConnection.setRemoteDescription(new RTCSessionDescription(offer));

  yourConnection.createAnswer(function (answer) {
    yourConnection.setLocalDescription(answer);
    send({
      type: "answer",
      answer: answer
    });
  }, function (error) {
    alert("An error has occurred");
  });
};

function onAnswer(answer) {
  yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

function onCandidate(candidate) {
  yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

hangUpButton.addEventListener("click", function () {
  send({
    type: "leave"
  });

  onLeave();
});

function onLeave() {
  connectedUser = null;
  theirVideo.src = null;
  yourConnection.close();
  yourConnection.onicecandidate = null;
  yourConnection.onaddstream = null;
  setupPeerConnection(stream);
};


function openDataChannel() {
  console.log("function openDataChannel");
  var dataChannelOptions = {
    reliable: true
  };
  dataChannel = yourConnection.createDataChannel("myLabel", dataChannelOptions);

  dataChannel.onerror = function (error) {
    console.log("Data Channel Error:", error);
  };

  dataChannel.onmessage = function (event) {
    console.log("Got Data Channel Message:", event.data);

    
  };

  dataChannel.onopen = function () {
    console.log("function onopen");
    var val = messageInput.value;
    received.innerHTML += "info: " + name + "connected <br />";
  received.scrollTop = received.scrollHeight;
    dataChannel.send(name + " has connected.");
  };

  dataChannel.onclose = function () {
    console.log("The Data Channel is Closed");
  };
}

// 영상 저장

function handleSourceOpen(event){
    console.log('MediaSource opened');
    sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
    console.log('Source buffer: ', sourceBuffer);
}

function toggleRecording(){
    if(recordButton.textContent === 'Start Recording'){
        startRecording();
        
    }else{
        stopRecording();
        recordButton.textContent = 'Start Recording';
        downloadButton.disabled = false;
    }
    
}

function startRecording(){
    recordedBlobs = [];
    var options = {mimeType: 'video/mp4;codecs=vp9'};
    if(!MediaRecorder.isTypeSupported(options.mimeType)){
        console.log(options.mimeType + ' is not supported');
        options = {mimeType: 'video/mp4;codecs=vp8'};
    if(!MediaRecorder.isTypeSupported(options.mimeType)){
        console.log(options.mimeType + ' is not supported');
        options = {mimeType: 'video/mp4'};
    if(!MediaRecorder.isTypeSupported(options.mimeType)){
        console.log(options.mimeType + ' is not supported');
        options = {mimeType:''};
    }    
    }
    }
    try{
        //console.log(window.stream1);
        mediaRecorder = new MediaRecorder(yourVideo.src, options);
        
    }catch(e){
        console.log('Exception while creating MediaRecorder: ' + e);
        alert('Exception while creating MediaRecorder:' + e + '.mimeType: ' + options.mimeType);
        return;
    }
    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    recordButton.textContent = 'Stop Recording';
    downloadButton.disabled = true;
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(10); // collect 10ms of data
    console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording(){
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedBlobs);
}

function handleStop(event){
    console.log('Recorder stopped: ', event);
}

function handleDataAvailable(event){
    if(event.data && event.data.size > 0){
        recordedBlobs.push(event.data);
    }
}

function download(){
    var blob = new Blob(recordedBlobs, {type: 'video/mp4'});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.mp4';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
       document.body.appendChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}