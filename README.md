# EpiSimulated-propagation-impact
## Choix du sujet: Calcul de propagation d'impact et notification optimisée.

**Objectif:**
Notifier uniquement les personnes réellement impactées et de manière optimisée.

## Choix du laguage stack:
**Backend: Node.js + TypeScript**

- Le typage statique aide énormément sur un projet où le cœur est un graphe de dépendances : les structures (Participant, Atelier, Relation) sont mieux sécurisées à la compilation, ce qui évite des bugs silencieux dans le parcours BFS/DFS.
- L'écosystème JS a une gestion native de l'asynchrone (event loop, async/await) qui colle bien à un système de notification : l'envoi de notifications est intrinsèquement un enchaînement d'opérations asynchrones (attente, batching, retry).
- Large choix de librairies prêtes à l'emploi pour la partie graphe (graphology, ngraph.graph) et pour les files de priorité (js-priority-queue, heap-js), ce qui couvre directement la tension technique centrale du sujet.
- Un seul langage pour tout le backend + la logique métier facilite les tests d'intégration bout-en-bout.

**Base de données: PostgreSQL**

- Un SGBD relationnel modélise naturellement un graphe de dépendances via des tables de jointure (participant ↔ atelier, atelier ↔ atelier), avec des contraintes d'intégrité (clés étrangères) qui empêchent les incohérences dans les relations.
- Les requêtes récursives (WITH RECURSIVE) permettent de vérifier/déboguer la propagation directement en SQL, en complément du parcours applicatif en BFS/DFS.
- Bon support des transactions, utile pour garantir qu'un changement en cascade est appliqué de façon atomique (éviter les notifications partielles en cas d'erreur).

**Frontend mobile: Flutter**

- Le sujet porte le tag "MOBILE" : Flutter permet de livrer une seule base de code pour Android/iOS, ce qui est pertinent si la démo doit montrer la réception de notifications côté utilisateur.
- Le support natif des notifications push (via Firebase Cloud Messaging) permet de démontrer concrètement l'ordonnancement et le regroupement des notifications sur un vrai appareil, plutôt qu'en logs uniquement.
- Le hot reload accélère les itérations pendant les phases de test de l'UI (utile vu le format sprint de 2 semaines).

**File de notification / rate limiting: Redis**
- Une structure Sorted Set Redis permet d'implémenter nativement une file de priorité persistante (score = niveau d'urgence + timestamp), ce qui correspond exactement au besoin d'ordonnancement.
- Les commandes atomiques de Redis (INCR, expiration de clés) sont bien adaptées pour implémenter un rate limiting fiable (ex: compteur de notifications envoyées par fenêtre de temps).
- Séparer la file de notification de la base relationnelle évite de mélanger la logique de "état métier" (PostgreSQL) et la logique de "file d'exécution" (Redis), ce qui rend le module notification plus testable indépendamment.

**Tests — Jest (backend) + Flutter test framework (mobile)**
- Jest permet de mocker facilement le temps (jest.useFakeTimers), indispensable pour tester la fenêtre de debouncing/batching sans attendre réellement les délais.
- Couverture de code intégrée nativement, ce qui facilite la justification en soutenance de la fiabilité du calcul d'impact (BFS/DFS, cycles, cascades).

## Dependances a installer

**npm install**

Ça va créer le dossier node_modules/ avec tous les binaires nécessaires, dont node_modules/.bin/tsc et node_modules/.bin/jest

## 