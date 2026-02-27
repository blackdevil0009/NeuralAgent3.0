import os
import speech_recognition as sr
from gtts import gTTS
from pydub import AudioSegment

class VoiceAssistant:
    """Integrated STT and TTS for multi-modal clinical interaction."""
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.supported_languages = ["en-IN", "hi-IN"]

    def speech_to_text(self, audio_file_path):
        """Converts clinical audio input to text."""
        try:
            # Convert to WAV if needed (SpeechRecognition prefers WAV)
            if not audio_file_path.endswith('.wav'):
                sound = AudioSegment.from_file(audio_file_path)
                wav_path = audio_file_path.rsplit('.', 1)[0] + ".wav"
                sound.export(wav_path, format="wav")
                audio_file_path = wav_path

            with sr.AudioFile(audio_file_path) as source:
                audio_data = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio_data)
                return text
        except Exception as e:
            print(f"STT Error: {e}")
            return "Unable to process audio signal. Please type your query. 🌿"

    def text_to_speech(self, text, output_filename="response_voice.mp3"):
        """Generates clinical voice response."""
        try:
            tts = gTTS(text=text, lang='en')
            output_path = os.path.join("backend/uploads", output_filename)
            tts.save(output_path)
            return output_path
        except Exception as e:
            print(f"TTS Error: {e}")
            return None
