# 🕵️ Malagasy Root Scraper

Ce dossier contient les outils de collecte et de préparation des données pour la langue malgache. L'objectif est d'extraire une liste exhaustive de racines et de leurs dérivés pour construire un dataset d'entraînement NLP.

---

## 🛠️ Rôle et Fonctionnement

Le scraper cible le site [tenymalagasy.org](https://tenymalagasy.org/bins/rootLists) pour récupérer la structure morphologique des mots.

### Concepts clés :
1. **Extraction de Racines** : Identification des unités sémantiques de base (ex: `vono`).
2. **Collecte de Dérivés** : Récupération des mots formés à partir de ces racines (ex: `mamono`, `mpamono`, `famonoana`).
3. **Structuration** : Transformation du HTML brut en fichiers JSON et CSV exploitables pour le Machine Learning.

---

## 📂 Fichiers principaux

- **`Malagasy_Root_Scraper.ipynb`** : Le notebook principal effectuant les requêtes HTTP et le parsing.
- **`malagasy_roots_final.json`** : Liste structurée des racines extraites.
- **`malagasy_derivations.json`** : Mapping complet entre racines et dérivés.
- **`requirements.txt`** : Dépendances nécessaires (BeautifulSoup4, Requests, Pandas).

---

## 🚀 Utilisation

1. Installez les dépendances :
   ```bash
   pip install -r requirements.txt
   ```
2. Ouvrez le notebook `Malagasy_Root_Scraper.ipynb` dans Jupyter.
3. Exécutez les cellules pour générer les nouveaux fichiers de données.

---

## 📊 Format des données produites

Le script génère des entrées de ce type :
```json
{
  "word": "miaboabo",
  "root": "abo",
  "morphemes": ["mi", "abo", "abo"]
}
```
Ces données sont ensuite déplacées vers le dossier `lemmnation/data/` pour l'étape d'apprentissage.

---

[⬅️ Revenir au projet global](../README.md)