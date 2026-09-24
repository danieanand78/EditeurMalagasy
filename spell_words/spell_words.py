import re

def spell_checker(word):
    consonant = "bdfghjklmnpqrstvz"
    vowels = "aeioy"

    rules = [
        (re.compile(r"[^a-zàô]", re.IGNORECASE), "caractère invalide"),
        (re.compile(r"(.)\1{1,}"), "répétition de deux lettres successivement"),
        (re.compile(r"[a-z]+[A-Z]+"), "majuscule mal placée"),
        (re.compile(r"\d"), "chiffre dans le mot")
    ]

    # Lettres interdites
    excluded_letters = ["c", "q", "u", "w", "x"]
    excluded_pattern = re.compile("|".join(excluded_letters), re.IGNORECASE)

    # Lettres/consonnes interdites en fin de mot
    forbidden_end_pattern = re.compile(f"[{consonant}i]$", re.IGNORECASE)

    # Combinaisons de consonnes autorisées
    allowed_consonant_pairs = ["mb", "mp", "nt", "nd", "ng", "nj", "nk", "tr", "dr", "ts"]

    # Fonction interne pour vérifier les paires de consonnes
    def check_consonant_pairs(word):
        word = word.lower()
        for i in range(len(word) - 1):
            pair = word[i:i+2]
            if pair[0] in consonant and pair[1] in consonant:
                if pair not in allowed_consonant_pairs:
                    return False
        return True

    # Détection des erreurs
    errors = []

    # Règles regex classiques
    for regex, message in rules:
        if regex.search(word):
            errors.append(message)

    # Lettres interdites
    if excluded_pattern.search(word):
        errors.append("lettre interdite")

    # Lettres/consonnes interdites en fin de mot
    if forbidden_end_pattern.search(word):
        errors.append("lettre/consonne interdite en fin de mot")

    # Combinaisons de consonnes
    if not check_consonant_pairs(word):
        errors.append("combinaison de consonnes interdite")

    return errors


# Interaction utilisateur
print("Détecteur d'erreur d'orthographe interactif")
print("Tapez 'Hivoaka' pour quitter.\n")

while True:
    mot = input("Tape un mot à vérifier : ")
    if mot.lower() == "Hivoaka":
        print("Veloma o !")
        break

    erreurs = spell_checker(mot)
    if erreurs:
        print(f"{mot} → Erreurs : {', '.join(erreurs)}\n")
    else:
        print(f"{mot} → OK\n")