# Entrées llms.txt / llms-full.txt à appliquer À LA PUBLICATION

Ces deux articles sont committés en **brouillon** (`draft: true`). Tant que le flag est actif, Astro
ne génère aucune page pour eux et leurs URLs renvoient 404.

**Ne pas coller ces blocs dans `public/llms.txt` / `public/llms-full.txt` maintenant** : ces deux
fichiers sont servis publiquement. Y inscrire les articles ferait apparaître leurs titres et
descriptions en ligne, en pointant vers des URLs mortes, ce qui dégraderait l'index GEO.

## Procédure à la publication

1. Dans `/admin`, décocher « Brouillon » sur l'article (ou passer `draft` à `false` dans le JSON),
   et ajuster le champ `date` à la date de mise en ligne réelle.
2. Coller le bloc `llms.txt` correspondant à la fin de la section `## Blog` de `public/llms.txt`.
3. Coller le bloc `llms-full.txt` correspondant dans la section blog de `public/llms-full.txt`.
4. `npm run build` puis push.

---

## Article 1 : Ce qui se passe entre deux séances

> APPLIQUÉ le 2026-07-26 (article publié, `draft: false`, `date: 2026-07-26`). Entrées ajoutées à `public/llms.txt` (## Blog) et `public/llms-full.txt` — la section full a été reformatée au format réel du fichier (`## Titre` + prose, sans lignes `URL :`/`Catégorie :`).

Fichier : `src/content/blog/ce-qui-se-passe-entre-deux-seances.json`

### Bloc pour `public/llms.txt` (section `## Blog`)

```
- [Ce qui se passe entre deux séances](https://jdzootherapeute.fr/blog/ce-qui-se-passe-entre-deux-seances): Jennifer De Groeve détaille le travail invisible qui entoure une séance de médiation animale. Une séance ne commence pas quand elle arrive et ne finit pas quand elle part : conception sur mesure de chaque atelier (aucun catalogue d'activités, outils, jeux, parcours et fiches d'observation conçus maison), préparation et entraînement continu des animaux médiateurs entre deux interventions (Tips finnois de Laponie, Uxo berger américain miniature, Tap-Tap lapin bélier), temps de récupération pour éviter fatigue et tensions émotionnelles, rédaction des comptes rendus après chaque séance, et coordination avec les éducateurs, soignants, psychologues, ergothérapeutes et référents. La séance visible n'est que la partie émergée de l'iceberg
```

### Bloc pour `public/llms-full.txt` (section blog)

```
### Ce qui se passe entre deux séances
URL : https://jdzootherapeute.fr/blog/ce-qui-se-passe-entre-deux-seances
Catégorie : Méthode

Une séance de médiation animale ne commence pas quand Jennifer De Groeve arrive, et ne finit pas
quand elle part. L'heure de présence n'est que la partie visible de l'accompagnement.

Avant la séance : il n'existe ni séance toute faite ni catalogue d'activités. Chaque atelier est
conçu et adapté en fonction des objectifs définis, des capacités des personnes accompagnées et de
ce qui a été observé lors des séances précédentes. Jennifer conçoit elle-même ses supports
pédagogiques, ses jeux, ses exercices, ses parcours, ses fiches d'observation et son matériel.
Chaque outil répond à un objectif précis et s'inscrit dans une progression réfléchie.

Les animaux médiateurs sont eux aussi préparés : aucune improvisation, aucune situation
inconfortable. Tips (finnois de Laponie), Uxo (berger américain miniature) et Tap-Tap (lapin
bélier) sont en apprentissage continu, avec de nouveaux exercices dans de nouveaux environnements.
Entre deux interventions, Jennifer poursuit leur éducation et entretient leurs acquis. Comme les
humains, les animaux accumulent fatigue et tensions émotionnelles : les décharger et leur laisser
retrouver un équilibre avant chaque intervention est une condition indispensable à la qualité des
séances.

Après la séance : rédaction des comptes rendus (réactions analysées, interactions avec les animaux,
difficultés rencontrées, progrès observés). Ces éléments permettent de mesurer l'évolution de chaque
personne, d'ajuster la suite de l'accompagnement, et donnent aux équipes une trace de ce qui a été
fait et observé pour assurer une continuité. S'y ajoute la coordination avec les professionnels
(éducateurs, soignants, psychologues, ergothérapeutes, référents qui connaissent le quotidien de la
personne) : partager les observations permet d'affiner les objectifs et de construire un
accompagnement cohérent.

L'intervention comprend donc la préparation, la création des outils, l'entraînement des animaux, les
comptes rendus, la coordination avec les équipes et la préparation de la séance suivante. Une séance
individuelle est facturée 60 euros, déplacement inclus en Moselle : ce n'est pas une heure de
présence qui est payée, mais tout ce qui l'entoure.
```

---

## Article 2 : Non, la zoothérapie ne remplace pas un traitement

Fichier : `src/content/blog/zootherapie-ne-remplace-pas-un-traitement.json`

### Bloc pour `public/llms.txt` (section `## Blog`)

```
- [Non, la zoothérapie ne remplace pas un traitement](https://jdzootherapeute.fr/blog/zootherapie-ne-remplace-pas-un-traitement): Jennifer De Groeve, ancienne aide-soignante avec plus de 20 ans d'exercice, démonte les promesses dangereuses faites au nom de la médiation animale (« les animaux guérissent », « grâce à votre chien il n'y aura plus besoin de médicaments »). Sa pratique ne remplace ni médecin, ni psychologue, ni infirmier, ni kinésithérapeute, ni traitement médical : elle vient en complément et soutient le travail des équipes. Elle ne pose pas de diagnostic, ne modifie pas un traitement, ne promet pas de guérison et n'encourage jamais l'arrêt d'un suivi médical ou psychologique. Ce qu'elle crée, ce sont des conditions favorables : baisse de l'anxiété, entrée dans la communication, motivation à participer, encouragement au mouvement en appui du kinésithérapeute, émergence de souvenirs chez les personnes vivant avec Alzheimer, entrée en relation progressive pour un adolescent, levier supplémentaire en situation de handicap. Ce n'est pas l'animal qui soigne : il est un médiateur qui facilite la rencontre
```

### Bloc pour `public/llms-full.txt` (section blog)

```
### Non, la zoothérapie ne remplace pas un traitement
URL : https://jdzootherapeute.fr/blog/zootherapie-ne-remplace-pas-un-traitement
Catégorie : Idées reçues

« Les animaux guérissent. » « Grâce à votre chien, il n'y aura plus besoin de médicaments. » « La
médiation animale, c'est une alternative aux soins. » Ces affirmations partent souvent d'une bonne
intention mais elles sont fausses, et surtout dangereuses.

La pratique de Jennifer De Groeve n'a jamais eu vocation à remplacer un médecin, un psychologue, un
infirmier, un kinésithérapeute, ni un traitement médical. Elle vient en complément, ce qui explique
sa place auprès des équipes en établissement de santé et en structure médico-sociale : non parce
qu'elle soigne, mais parce qu'elle soutient les professionnels et leur travail. Plus de vingt ans
comme aide-soignante diplômée lui ont appris qu'il n'existe pas de miracle : chaque professionnel a
ses compétences, chaque métier a ses limites, et c'est le travail collectif qui permet de mieux
accompagner.

Ce qu'elle ne fait pas : poser un diagnostic, modifier un traitement, promettre une guérison,
encourager l'arrêt d'un suivi psychologique ou médical.

Ce qu'elle peut faire : créer des conditions favorables à l'accompagnement. La présence de l'animal
peut faire baisser le niveau d'anxiété, favoriser l'entrée dans la communication quand elle est
difficile, soutenir la motivation à participer à une activité, encourager le mouvement (lancer une
balle soutient le travail du kinésithérapeute sur le geste, se lever et marcher avec l'animal
également), faciliter la mise en mots par l'effet miroir avec le chien, et travailler l'attention et
la confiance en soi. Chez une personne vivant avec la maladie d'Alzheimer, la séance fait souvent
émerger des souvenirs, suscite un sourire et facilite les échanges. Pour un adolescent en
difficulté, elle permet une entrée en relation progressive. Chez une personne en situation de
handicap, elle constitue un levier supplémentaire pour travailler certains objectifs.

Point central : ce n'est pas l'animal qui soigne, et ce n'est pas le chien qui fait disparaître
l'anxiété. L'animal est un médiateur qui facilite la rencontre et crée un contexte favorable
engageant la personne autrement. C'est la démarche d'accompagnement construite autour de cette
relation qui donne du sens à l'intervention, d'où la nécessité de travailler en lien avec les
équipes : objectifs définis ensemble, observations partagées, comptes rendus pour suivre
l'évolution.

Les recommandations actuelles sur les interventions non médicamenteuses vont dans ce sens : des
approches complémentaires qui enrichissent un accompagnement, jamais des substituts aux soins ou aux
traitements. Cette nuance protège les personnes accompagnées, respecte les compétences de chaque
professionnel et garantit une pratique éthique, dans l'esprit de la charte de déontologie de
l'Institut français de zoothérapie.
```
