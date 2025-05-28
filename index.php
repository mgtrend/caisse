<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MG CAISSE</title>
    
    <!-- Tailwind CDN - Version compressée -->
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#3B82F6"> <!-- Blue-500 -->
    <link rel="apple-touch-icon" href="assets/img/icon-192.png"> <!-- Placeholder for icon -->

    <!-- Custom minimal CSS (can be in assets/css/style.min.css) -->
    <style>
        /* Simple loading spinner */
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #3B82F6; /* Blue-500 */
            animation: spin 1s ease infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        /* Offline indicator */
        #cache-status {
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: #10B981; /* Emerald-500 */
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.75rem; /* text-xs */
            display: none; /* Hidden by default */
            z-index: 1000;
        }
        /* Basic transition for sections */
        .section { transition: opacity 0.5s ease-in-out; }
        .hidden-section { display: none; opacity: 0; }
        .visible-section { display: block; opacity: 1; }
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div id="app" class="container mx-auto p-4 max-w-4xl">
        
        <!-- Offline Status Indicator -->
        <div id="cache-status">Mode Hors-ligne</div>

        <!-- Header -->
        <header class="bg-white shadow rounded-lg p-4 mb-6 flex justify-between items-center">
            <div class="flex items-center">
                 <!-- Placeholder for logo -->
                 <img src="/home/ubuntu/upload/1000008089.png" alt="MG CAISSE Logo" class="h-10 mr-3">
                 <h1 class="text-2xl font-bold text-gray-800">MG CAISSE</h1>
            </div>
            <div id="user-info" class="text-right hidden">
                <span id="user-email" class="text-sm text-gray-600"></span>
                <button id="logout-button" class="ml-4 bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded">Déconnexion</button>
            </div>
        </header>

        <!-- Loading Indicator -->
        <div id="loading-indicator" class="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50 hidden">
            <div class="spinner"></div>
        </div>

        <!-- Login Section -->
        <section id="login-section" class="section bg-white p-6 rounded-lg shadow visible-section">
            <h2 class="text-xl font-semibold mb-4 text-center">Connexion</h2>
            <form id="login-form">
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" id="email" placeholder="votreadresse@email.com" class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="mb-4">
                    <label for="serial" class="block text-sm font-medium text-gray-700 mb-1">Numéro de série</label>
                    <input type="text" id="serial" placeholder="MGXXXXXXX" class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <!-- Add password field if needed by auth logic -->
                <!-- <div class="mb-4">
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                    <input type="password" id="password" placeholder="Votre mot de passe" class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div> -->
                <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">Se connecter</button>
                <p id="login-error" class="text-red-500 text-sm mt-3 text-center"></p>
            </form>
        </section>

        <!-- POS Interface Section (Hidden Initially) -->
        <section id="pos-interface" class="section hidden-section">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Product List -->
                <div class="md:col-span-2 bg-white p-4 rounded-lg shadow">
                    <h2 class="text-xl font-semibold mb-4">Produits</h2>
                    <div class="mb-4">
                         <input type="text" id="product-search" placeholder="Rechercher un produit..." class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div id="product-list" class="max-h-96 overflow-y-auto">
                        <!-- Product items will be loaded here -->
                        <p class="text-gray-500">Chargement des produits...</p>
                    </div>
                </div>

                <!-- Current Sale / Cart -->
                <div class="md:col-span-1 bg-white p-4 rounded-lg shadow">
                    <h2 class="text-xl font-semibold mb-4">Vente en cours</h2>
                    <div id="cart-items" class="mb-4 min-h-[100px]">
                        <!-- Cart items will be added here -->
                        <p class="text-gray-500 text-sm">Ajoutez des produits à la vente.</p>
                    </div>
                    <div class="border-t pt-4">
                        <div class="flex justify-between mb-2 font-semibold">
                            <span>Total:</span>
                            <span id="cart-total">0.000 TND</span>
                        </div>
                        <div class="mb-3">
                             <label for="payment-method" class="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
                             <select id="payment-method" class="w-full p-2 border border-gray-300 rounded bg-white">
                                 <option value="cash">Espèces</option>
                                 <option value="card">Carte</option>
                                 <option value="d17">D17</option>
                             </select>
                        </div>
                        <button id="complete-sale-button" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300">Valider la vente</button>
                    </div>
                </div>
            </div>
            
            <!-- Sales History / Sync Status (Example) -->
             <div class="mt-6 bg-white p-4 rounded-lg shadow">
                 <h2 class="text-xl font-semibold mb-4">Historique / Actions</h2>
                 <button id="sync-button" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition duration-300 mr-2">Synchroniser</button>
                 <span id="sync-status" class="text-sm text-gray-600"></span>
                 <!-- Sales history could be loaded here -->
             </div>
        </section>

    </div>

    <!-- Main Application JavaScript -->
    <script src="assets/js/app.min.js"></script>

</body>
</html>
