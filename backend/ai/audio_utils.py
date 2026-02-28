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
        """Converts clinical audio input to text with ffmpeg fallback check."""
        try:
            # Check if file is already WAV
            if audio_file_path.endswith('.wav'):
                with sr.AudioFile(audio_file_path) as source:
                    audio_data = self.recognizer.record(source)
                    return self.recognizer.recognize_google(audio_data)

            # Attempt conversion via pydub (requires ffmpeg)
            try:
                sound = AudioSegment.from_file(audio_file_path)
                wav_path = audio_file_path.rsplit('.', 1)[0] + "_converted.wav"
                sound.export(wav_path, format="wav")
                with sr.AudioFile(wav_path) as source:
                    audio_data = self.recognizer.record(source)
                    return self.recognizer.recognize_google(audio_data)
            except Exception as pydub_err:
                print(f"Pydub/FFMPEG Error: {pydub_err}")
                return f"[Backend: FFMPEG missing or format unsupported. Received: {os.path.basename(audio_file_path)}]"

        except Exception as e:
            print(f"STT Error: {e}")
            return "Unable to process audio signal. Please ensure ffmpeg is installed for non-wav formats. 🌿"

    def text_to_speech(self, text, output_filename=None):
        """Generates clinical voice response with robust path handling and unique naming."""
        try:
            if not output_filename:
                import time
                output_filename = f"response_{int(time.time())}.mp3"
                
            tts = gTTS(text=text, lang='en')
            # Ensure path is relative to the backend execution directory
            output_dir = os.path.join(os.getcwd(), "uploads")
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            output_path = os.path.join(output_dir, output_filename)
            tts.save(output_path)
            return output_path
        except Exception as e:
            print(f"TTS Error: {e}")
            return None
