//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var recorder; 						//WebAudioRecorder object
var input; 							//MediaStreamAudioSourceNode  we'll be recording
var encodingType; 					//holds selected encoding for resulting audio (file)
var encodeAfterRecord = true;       // when to encode

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //new audio context to help us record

var encodingTypeSelect = document.getElementById("encodingTypeSelect");
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
	console.log("startRecording() called");

	/*
		Simple constraints object, for more advanced features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

    /*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		__log("stream created, initializing WebAudioRecorder...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();

		//update the format 
		document.getElementById("formats").innerHTML="Format: 2 channel "+encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value+" @ "+audioContext.sampleRate/1000+"kHz"

		//assign to gumStream for later use
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);
		
		//stop the input from playing back through the speakers
		//input.connect(audioContext.destination)

		//get the encoding 
		encodingType = encodingTypeSelect.options[encodingTypeSelect.selectedIndex].value;
		
		//disable the encoding selector
		encodingTypeSelect.disabled = true;

		recorder = new WebAudioRecorder(input, {
		  workerDir: "static/js/", // must end with slash
		  encoding: encodingType,
		  numChannels:2, //2 is the default, mp3 encoding supports only 2
		  onEncoderLoading: function(recorder, encoding) {
		    // show "loading encoder..." display
		    __log("Loading "+encoding+" encoder...");
		  },
		  onEncoderLoaded: function(recorder, encoding) {
		    // hide "loading encoder..." display
		    __log(encoding+" encoder loaded");
		  }
		});
		recorder.onComplete = function(recorder, blob) { 
			__log("Encoding complete");
			// createDownloadLink(blob,recorder.encoding);
			sendAudioToServer(blob);
			encodingTypeSelect.disabled = false;
		}

		recorder.setOptions({
		  timeLimit:120,
		  encodeAfterRecord:encodeAfterRecord,
	      ogg: {quality: 0.5},
	      mp3: {bitRate: 160}
	    });

		//start the recording process
		recorder.startRecording();

		 __log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUSerMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;

	});

	//disable the record button
    recordButton.disabled = true;
    stopButton.disabled = false;
}
function sendAudioToServer(blob) {
    // Convert blob to FormData object
    const formData = new FormData();
    // formData.append('audio', blob);
	formData.append('audio', blob, 'audio.wav');
    // Make HTTP POST request to the API endpoint
    fetch('/speech-to-text', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
	.then(text => {
		// outputDiv.textContent = 'Transcribed text: ' + text;
		__log("Recorded audio translated to text");
		console.log('Transcribed text: ', text);
		translate_to_tamil(text)
	})
	.catch(error => {
		console.error('Error sending audio to server:', error);
	});
}
function translate_to_tamil(text){
	const formData = new FormData();
    formData.append('text',text);
	fetch('/translate', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
	.then(text => {
		// outputDiv.textContent = 'Transcribed text: ' + text;
		//console.log('Tamil text: ', text);
		tamil_to_audio(text)
	})
}
function tamil_to_audio(text) {
    const formData = new FormData();
    formData.append('text', text);
    fetch('/text-to-speech', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(audioUrl => {
        // Use the audio URL to create a download link
        createDownloadLink1(audioUrl);
    })
    .catch(error => {
        console.error('Error converting text to audio:', error);
    });
}

// Handle translation response from backend
function handleTranslationResponse(translatedText) {
    // Convert translated text to audio using backend
    // Provide audio link to user
}
function stopRecording() {
	console.log("stopRecording() called");
	
	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//disable the stop button
	stopButton.disabled = true;
	recordButton.disabled = false;
	
	//tell the recorder to finish the recording (stop recording + encode the recorded audio)
	recorder.finishRecording();

	__log('Recording stopped');
}

function createDownloadLink(blob,encoding) {
	
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//link the a element to the blob
	link.href = url;
	link.download = new Date().toISOString() + '.'+encoding;
	link.innerHTML = link.download;

	//add the new audio and a elements to the li element
	li.appendChild(au);
	li.appendChild(link);

	//add the li element to the ordered list
	recordingsList.appendChild(li);
}
function createDownloadLink1(url) {
    var au = document.createElement('audio');
    var li = document.createElement('li');
    var link = document.createElement('a');

    // Add controls to the <audio> element
    au.controls = true;
    au.src = url;

    // Set the download link attributes
    link.href = url;
    link.download = 'translated_audio.mp3'; // Set a descriptive name for the downloaded file
    link.textContent = 'Download Translated Audio'; // Provide user-friendly text for the download link

    // Append the audio and download link elements to the list item
    li.appendChild(au);
    li.appendChild(link);

    // Append the list item to the ordered list
    recordingsList.appendChild(li);
}


//helper function
function __log(e, data) {
	log.innerHTML += "\n" + e + " " + (data || '');
}