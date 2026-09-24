# 🧠 Malagasy Morpheme Segmentation & Lemmatization

Ce dossier contient l'implémentation de l'intelligence artificielle pour la segmentation automatique des mots malgaches.

---

## 🏗️ Architecture du Modèle

Le modèle utilise une architecture **Seq2Seq (Sequence-to-Sequence)** au niveau des caractères avec des couches **LSTM** (Long Short-Term Memory).

- **Encoder** : Analyse la structure du mot caractère par caractère pour en extraire un vecteur d'état "pensée".
- **Decoder** : Génère la séquence des morphèmes segmentés en utilisant le vecteur d'état de l'encodeur.
- **Root Tagging** : Le modèle apprend non seulement à segmenter mais aussi à identifier la racine sémantique en l'entourant de crochets (ex: `miaboabo` ➔ `mi|[abo]|[abo]`).

---

## 📂 Organisation du dossier

- **`encoder_decoder_Model.ipynb`** : Notebook complet (Prétraitement, Définition, Entraînement, Inférence).
- **`data/`** : Contient les fichiers CSV et JSON issus du scraping utilisés pour l'entraînement.
- **`models/`** : Stockage des artefacts du modèle :
    - `best_model.keras` : Les poids du modèle le plus performant.
    - `vocab_data.pkl` : Le dictionnaire de caractères pour la vectorisation.
    - `training_curves.png` : Visualisation de l'apprentissage.

---

## 📉 Performance et Apprentissage

Le modèle a été entraîné avec du matériel accéléré (GPU). Voici les courbes de perte (Loss) et de précision (Accuracy) :

![Courbes d'entraînement](./models/training_curves.png)

### Statistiques finales :
| Métrique | Performance |
|---|---|
| **Précision (Accuracy)** | **98.76%** |
| **Erreur (Val Loss)** | **0.0570** |
| **Temps par époque** | **~4 secondes (GPU)** |

---

## 🚀 Configuration GPU

Le notebook est optimisé pour les cartes graphiques NVIDIA (ex: GTX 1650 Ti).
Il inclut une gestion dynamique du `LD_LIBRARY_PATH` pour CUDA 12 et une limitation de la mémoire à **75%** pour garantir la stabilité du système.

```python
# Extrait du code de configuration
tf.config.set_logical_device_configuration(
    gpus[0],
    [tf.config.LogicalDeviceConfiguration(memory_limit=3072)]
)
```

---

## 🧪 Exemple d'Inférence

| Mot d'entrée | Prédiction du modèle (Segmentation + Racine) |
|---|---|
| `miaboabo` | `mi - [abo] - [abo]` |
| `fahatany` | `faha - [tany]` |
| `mahakasy` | `maha - [kasy]` |

---

[⬅️ Revenir au projet global](../README.md)
