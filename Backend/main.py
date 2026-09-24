import os
import pickle
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Malagasy Lemmatization/Morpheme API", version="1.0")

# Setup CORS to allow requests from the Next.js / React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "malagasy_morpheme_model_tagged.keras")
VOCAB_PATH = os.path.join(MODEL_DIR, "vocab_data.pkl")

# Global variables to store the computational graph
model_saved = None
encoder_model = None
decoder_model = None
char2idx = {}
idx2char = {}
MAX_LEN_IN = 0
MAX_LEN_OUT = 0

@app.on_event("startup")
def load_resources():
    global model_saved, encoder_model, decoder_model
    global char2idx, idx2char, MAX_LEN_IN, MAX_LEN_OUT
    
    print("🔄 Chargement du dictionnaire (vocab_data.pkl)...")
    if not os.path.exists(VOCAB_PATH):
        raise FileNotFoundError(f"Fichier de vocabulaire introuvable : {VOCAB_PATH}")
        
    with open(VOCAB_PATH, 'rb') as f:
        vocab_data = pickle.load(f)
        char2idx = vocab_data['char2idx']
        idx2char = vocab_data['idx2char']
        MAX_LEN_IN = vocab_data['MAX_LEN_IN']
        MAX_LEN_OUT = vocab_data['MAX_LEN_OUT']
        
    print("🔄 Chargement du modèle Keras principal...")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Modèle Keras introuvable : {MODEL_PATH}")
        
    model_saved = tf.keras.models.load_model(MODEL_PATH)
    
    # Validation des calques
    try:
        # 1. Reconstruire l'encodeur
        encoder_inputs = model_saved.input[0]
        encoder_lstm = model_saved.get_layer('lstm')
        
        state_h = encoder_lstm.output[1]
        state_c = encoder_lstm.output[2]
        
        encoder_model = tf.keras.Model(
            inputs=encoder_inputs,
            outputs=[state_h, state_c]
        )
        
        # 2. Reconstruire le décodeur
        decoder_inputs = model_saved.input[1]
        LSTM_UNITS = encoder_lstm.output[1].shape[-1]
        
        decoder_state_input_h = tf.keras.Input(shape=(LSTM_UNITS,), name='input_h')
        decoder_state_input_c = tf.keras.Input(shape=(LSTM_UNITS,), name='input_c')
        decoder_states_inputs = [decoder_state_input_h, decoder_state_input_c]
        
        decoder_lstm  = model_saved.get_layer('lstm_1')
        decoder_embed = model_saved.get_layer('embedding_1')
        
        dec_emb = decoder_embed(decoder_inputs)
        dec_out, dec_h, dec_c = decoder_lstm(
            dec_emb,
            initial_state=decoder_states_inputs
        )
        
        decoder_dense   = model_saved.get_layer('dense')
        decoder_outputs = decoder_dense(dec_out)
        
        decoder_model = tf.keras.Model(
            inputs=[decoder_inputs] + decoder_states_inputs,
            outputs=[decoder_outputs, dec_h, dec_c]
        )
        print("✅ Modèles Encodeur/Décodeur prêts pour l'inférence !")
    except Exception as e:
        print(f"❌ Erreur lors de la reconstruction du modèle Seq2Seq : {e}")
        raise e

import re

def spell_checker(word):
    consonant = "bdfghjklmnpqrstvz"
    rules = [
        (re.compile(r"[^a-zàô]", re.IGNORECASE), "caractère invalide"),
        (re.compile(r"(.)\1{1,}"), "répétition de deux lettres successivement"),
        (re.compile(r"[a-z]+[A-Z]+"), "majuscule mal placée"),
        (re.compile(r"\d"), "chiffre dans le mot")
    ]
    excluded_letters = ["c", "q", "u", "w", "x"]
    excluded_pattern = re.compile("|".join(excluded_letters), re.IGNORECASE)
    forbidden_end_pattern = re.compile(f"[{consonant}i]$", re.IGNORECASE)
    allowed_consonant_pairs = ["mb", "mp", "nt", "nd", "ng", "nj", "nk", "tr", "dr", "ts"]

    def check_consonant_pairs(word):
        word = word.lower()
        for i in range(len(word) - 1):
            pair = word[i:i+2]
            if pair[0] in consonant and pair[1] in consonant:
                if pair not in allowed_consonant_pairs:
                    return False
        return True

    errors = []
    for regex, message in rules:
        if regex.search(word):
            errors.append(message)
    if excluded_pattern.search(word):
        errors.append("lettre interdite")
    if forbidden_end_pattern.search(word):
        errors.append("lettre/consonne interdite en fin de mot")
    if not check_consonant_pairs(word):
        errors.append("combinaison de consonnes interdite")
    return errors

class PredictRequest(BaseModel):
    word: str

@app.post("/lemmatize")
def predict_morphemes(req: PredictRequest):
    word = req.word.strip()
    if not word:
        raise HTTPException(status_code=400, detail="Le mot ne peut pas être vide")
        
    # Spell checking
    errors = spell_checker(word)
    is_valid = len(errors) == 0
    
    # We still try to lemmatize if it's alphanumeric, but we mark it
    try:
        clean_word = word.lower()
        
        # Preprocessing input
        input_seq = [[char2idx.get(char, 0) for char in clean_word]]
        input_seq = tf.keras.preprocessing.sequence.pad_sequences(
            input_seq, maxlen=MAX_LEN_IN, padding='post'
        )
        
        # Encode
        states = encoder_model.predict(input_seq, verbose=0)
        
        # Decode step-by-step
        target = np.zeros((1, 1))
        target[0, 0] = char2idx['<SOS>']
        
        result_str = ""
        for _ in range(MAX_LEN_OUT):
            tokens, h, c = decoder_model.predict(
                [target, states[0], states[1]], verbose=0
            )
            idx  = np.argmax(tokens[0, -1, :])
            char = idx2char[idx]
            if char == '<EOS>': break
            result_str += char
            target[0, 0] = idx
            states = [h, c]
            
        return {
            "original_word": word,
            "is_valid": is_valid,
            "errors": errors,
            "lemmatized_string": result_str if is_valid else "",
            "formatted": result_str.replace("|", " - ") if is_valid else "[Mot incorrect]"
        }
        
    except Exception as e:
        # Fallback if model fails or word contains unknown chars
        return {
            "original_word": word,
            "is_valid": is_valid,
            "errors": errors,
            "lemmatized_string": "",
            "formatted": "[Erreur analyse]"
        }

# Add a health check
@app.get("/")
def read_root():
    return {"status": "ok", "message": "API de lemmatisation Malgache en ligne !"}

if __name__ == "__main__":
    import uvicorn
    # Lancement direct via `python main.py`
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
