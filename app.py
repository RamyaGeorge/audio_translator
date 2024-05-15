from flask import Flask, render_template, request, redirect, send_from_directory
import speech_recognition as sr
from googletrans import Translator
from gtts import gTTS
import os
app = Flask(__name__)


@app.route("/", methods=["GET", "POST"])
def index():
    transcript = ""
    if request.method == "POST":
        print("FORM DATA RECEIVED")

        if "file" not in request.files:
            return redirect(request.url)

        file = request.files["file"]
        if file.filename == "":
            return redirect(request.url)

        if file:
            recognizer = sr.Recognizer()
            audioFile = sr.AudioFile(file)
            with audioFile as source:
                data = recognizer.record(source)
            transcript = recognizer.recognize_google(data, key=None)

    return render_template('index.html', transcript=transcript)

@app.route('/translate', methods=['GET','POST'])
def translate_text():
    translated_text = ""
    if request.method == "POST":
        text = request.form['text']
        translator = Translator()
        translated_text = translator.translate(text, dest='ta')
        translated_text = translated_text.text
        return translated_text
    return render_template('index.html', translated_text=translated_text)

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    text = request.form['text']
    tts = gTTS(text, lang='ta')
    audio_filename = 'translated_audio.mp3'
    tts.save(audio_filename)
    # Return the URL of the generated audio file
    return '/' + audio_filename

@app.route('/<path:filename>')
def download_file(filename):
    # Serve the audio file for download
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), filename)


@app.route('/speech-to-text', methods=['GET','POST'])
def speech_to_text():
    text = ""
    if request.method == "POST":
        audio = request.files['audio']
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language='en-in')
        return text
    return render_template('index.html', text=text)

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
