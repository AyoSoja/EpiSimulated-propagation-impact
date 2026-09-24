
# Architecture — Benchmark BFS vs DFS

## Contexte

Le calcul de l'ensemble impacté (`ImpactCalculator.computeImpactedSet`) repose sur un
parcours du graphe de dépendances à partir du nœud modifié. Deux stratégies de
parcours ont été implémentées et comparées : **BFS** (`computeImpactedWorkshopIds`)
et **DFS itératif** (`computeImpactedWorkshopIdsDFS`).

Une troisième variante, **DFS récursif**, a été testée puis écartée avant même
d'entrer dans le benchmark de performance — voir la section "Pourquoi pas de DFS
récursif" ci-dessous.

## Méthodologie

- Script : [`scripts/benchmark-bfs-dfs.ts`](../scripts/benchmark-bfs-dfs.ts)
- Graphes générés pour 3 topologies représentatives :
  - **chain** : dépendance linéaire (w0 ← w1 ← w2 ← ... ← wn), pire cas de profondeur
  - **wide** : tous les ateliers dépendent directement d'un seul atelier racine (fan-out large), pire cas de largeur
  - **tree** : arbre équilibré avec branchement 4, cas intermédiaire réaliste (un atelier a rarement plus de quelques dépendants directs)
- Tailles testées : 100, 1 000, 10 000 et 100 000 nœuds
- Chaque mesure est la **médiane de 5 exécutions** (pour lisser le bruit du JIT / garbage collector)
- Exécuté avec Node.js, `process.hrtime.bigint()` pour la précision

## Résultats (médiane en millisecondes)

| n | topologie | BFS (ms) | DFS itératif (ms) |
|---|---|---|---|
| 100 | chain | 0.032 | 0.027 |
| 100 | wide | 0.025 | 0.028 |
| 100 | tree | 0.025 | 0.026 |
| 1 000 | chain | 0.278 | 0.207 |
| 1 000 | wide | 0.178 | 0.184 |
| 1 000 | tree | 0.040 | 0.062 |
| 10 000 | chain | 1.140 | 0.824 |
| 10 000 | wide | 0.745 | 0.672 |
| 10 000 | tree | 0.814 | 0.726 |
| 100 000 | chain | 15.860 | 11.512 |
| 100 000 | wide | 9.025 | 10.609 |
| 100 000 | tree | 11.462 | 10.766 |

## Pourquoi pas de DFS récursif

Une implémentation naïve du DFS (récursion classique, une fonction qui s'appelle
elle-même sur chaque dépendant) a été testée sur une chaîne de 100 000 ateliers.
Résultat :

```
RangeError: Maximum call stack size exceeded
```

Ce n'est pas un cas pathologique artificiel : une chaîne de dépendances profonde
correspond exactement au scénario métier "un atelier qui s'enchaîne sur un autre,
qui s'enchaîne sur un autre..." décrit dans le brief. Un système de notification
qui plante sur ce cas n'est pas acceptable. **Le DFS récursif est donc écarté**,
et seule la version itérative (avec une pile explicite) a été retenue et comparée
au BFS.

## Interprétation

- Les deux algorithmes sont en **complexité O(V + E)** (nombre de nœuds + arêtes) :
  aucune différence structurelle de performance n'est attendue, et les résultats le
  confirment — sur toutes les tailles et topologies testées, l'écart entre BFS et
  DFS itératif reste dans la même échelle de grandeur (souvent < 30 %), sans
  vainqueur systématique d'une topologie à l'autre.
- Le DFS itératif est légèrement plus rapide sur la topologie `chain` (jusqu'à ~27 %
  à 100 000 nœuds), car `Array.pop()` (utilisé par la pile du DFS) est en O(1),
  alors que `Array.shift()` (utilisé par la file du BFS) est en O(n) en JavaScript —
  chaque `shift()` doit réindexer tout le tableau. Cet écart est un détail
  d'implémentation du langage, pas une propriété fondamentale de l'algorithme.
- Sur `wide`, le BFS est légèrement plus rapide car la file reste courte
  (peu de niveaux de profondeur), ce qui limite l'impact du coût de `shift()`.

## Choix retenu : BFS

**`computeImpactedSet()` utilise le BFS en production** (`computeImpactedWorkshopIds`),
pour deux raisons indépendantes de la performance brute :

1. **Ordre de découverte cohérent avec la notion de "cascade par niveaux"** : le BFS
   traite d'abord tous les impacts directs (niveau 1), puis les impacts indirects
   (niveau 2), etc. Cet ordre correspond naturellement à la façon dont on veut
   raisonner sur une cascade de notifications (le futur module `notification`
   pourra s'appuyer sur cet ordre pour prioriser les impacts directs avant les
   indirects, sans recalcul).
2. **Pas de dépendance à la topologie** : le DFS itératif est plus rapide sur des
   chaînes profondes et plus lent sur des graphes larges — son avantage dépend donc
   de la forme du graphe, qui n'est pas connue à l'avance et peut varier d'un
   événement à l'autre. Le BFS a un comportement plus prévisible d'une exécution à
   l'autre.

`computeImpactedWorkshopIdsDFS()` est conservée dans le code (pas supprimée) : elle
reste disponible pour du debug ou une éventuelle optimisation ciblée si un profil de
performance réel (mesuré en production, pas en benchmark synthétique) montrait un
besoin différent.

Episimulated-Propagation-Impact
    |
    |__.github/
    |   |__ISSUE_TEMPLATE
    |   |   |__bug_report.md
    |   |   |__user_story.md
    |   |
    |   |__workflows/
    |      |__ci.yml
    |
    |__docs/
    |   |__architecture.md
    |
    |__scripts/
    |   |__benchmark-bfs-dfs.ts
    |
    |__src/
    |   |__api
    |   |__batching
    |   |__graph
    |   |__notification
    |
    |__tests/
    |__.gitignore
    |__package.json
    |__README.md