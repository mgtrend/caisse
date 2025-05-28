# MG CAISSE - Point de Vente

Application complète de gestion de caisse pour commerçants tunisiens, optimisée pour GitHub Pages.

## 🚀 Fonctionnalités

- **Interface POS moderne** - Interface utilisateur intuitive et responsive
- **Gestion des produits** - Ajout, modification, recherche de produits
- **Système de panier** - Gestion complète du panier avec quantités
- **Paiements multiples** - Espèces, carte, D17
- **Mode hors-ligne** - Fonctionne sans connexion internet
- **PWA** - Installation sur mobile et desktop
- **Synchronisation** - Sync automatique des données

## 🛠️ Technologies

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Styling**: Tailwind CSS
- **Base de données**: IndexedDB
- **PWA**: Service Worker, Web App Manifest
- **Hébergement**: GitHub Pages

## 📱 Installation

### Déploiement automatique

1. Fork ce repository
2. Activez GitHub Pages dans les paramètres
3. L'application sera disponible sur `https://votre-username.github.io/caisse/`

### Développement local

\`\`\`bash
# Cloner le repository
git clone https://github.com/mgtrend/caisse.git
cd caisse

# Servir localement (Python)
python -m http.server 8000

# Ou avec Node.js
npx serve .

# Ouvrir http://localhost:8000
\`\`\`

## 🔐 Authentification

Comptes de test disponibles :

- **Email**: test@mgcaisse.tn
- **Série**: MG2024001

- **Email**: demo@mgcaisse.tn  
- **Série**: MG2024002

## 📊 Utilisation

1. **Connexion** - Utilisez les identifiants de test
2. **Ajouter des produits** - Cliquez sur "+ Ajouter"
3. **Vendre** - Cliquez sur les produits pour les ajouter au panier
4. **Paiement** - Choisissez le mode de paiement

## 🔧 Configuration

### Variables d'environnement

Pour la production, configurez :

\`\`\`javascript
// assets/js/auth.js
this.apiUrl = 'https://votre-api.supabase.co/rest/v1';
this.apiKey = 'votre-cle-supabase';
\`\`\`

### Domaine personnalisé

1. Ajoutez un fichier `CNAME` avec votre domaine
2. Configurez les DNS chez votre registrar

## 📱 PWA

L'application peut être installée comme une app native :

- **Android**: Menu → "Ajouter à l'écran d'accueil"
- **iOS**: Partager → "Sur l'écran d'accueil"
- **Desktop**: Icône d'installation dans la barre d'adresse

## 🔄 Synchronisation

- **Mode hors-ligne**: Toutes les données sont stockées localement
- **Retour en ligne**: Synchronisation automatique
- **Sauvegarde**: Les données persistent entre les sessions

## 🎯 Roadmap

- [ ] Rapports de vente
- [ ] Gestion des clients
- [ ] Codes-barres
- [ ] Factures PDF
- [ ] Multi-utilisateurs
- [ ] API backend complète

## 📄 Licence

MIT License - Voir le fichier LICENSE

## 🤝 Contribution

Les contributions sont les bienvenues ! Ouvrez une issue ou soumettez une PR.

## 📞 Support

Pour le support technique : [Ouvrir une issue](https://github.com/mgtrend/caisse/issues)
