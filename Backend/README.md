# 🚀 Malagasy Morpheme — Backend API

Ce dossier contient l'interface de programmation (API) qui permet d'exposer le modèle de segmentation morphologique au monde extérieur.

---

## 🛠️ Rôle et Technologies

Le backend agit comme une passerelle entre le modèle **Keras (.keras)** et l'interface utilisateur.

### Fonctionnalités prévues :
1.  **Chargement du Modèle** : Chargement du fichier `best_model.keras` au démarrage du serveur.
2.  **Inférence en Temps Réel** : Traitement des requêtes POST pour segmenter les mots malgaches.
3.  **Normalisation** : Prétraitement des chaînes de caractères avant passage dans le réseau de neurones.

### Stack Technologique suggérée :
- **FastAPI / Flask** : Pour la rapidité de création des points de terminaison (endpoints).
- **TensorFlow Serving** (optionnel) : Pour des performances d'inférence optimisées.
- **Pydantic** : Pour la validation des données d'entrée.

---

## 📡 Endpoints (Prévisionnel)

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Vérification de l'état du serveur (Health Check). |
| `POST` | `/segment` | Envoie un mot malgache et reçoit la segmentation complète. |

---

[⬅️ Revenir au projet global](../README.md)
