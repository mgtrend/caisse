// assets/js/app.js - Application principale
import { DatabaseManager } from "./database.js"
import { AuthManager } from "./auth.js"

class MGCaisseApp {
  constructor() {
    this.dbManager = new DatabaseManager()
    this.authManager = new AuthManager()
    this.cart = []
    this.currentUser = null
    this.isOnline = navigator.onLine

    this.init()
  }

  async init() {
    try {
      // Initialiser la base de données
      await this.dbManager.init()

      // Vérifier l'authentification
      this.checkAuth()

      // Enregistrer le Service Worker
      this.registerServiceWorker()

      // Configurer les événements
      this.setupEventListeners()

      // Masquer l'écran de chargement
      setTimeout(() => {
        document.getElementById("loading-screen").style.display = "none"
        document.getElementById("app").style.display = "block"
      }, 1500)
    } catch (error) {
      console.error("Erreur d'initialisation:", error)
      this.showError("Erreur lors du chargement de l'application")
      // Afficher quand même l'application en cas d'erreur
      document.getElementById("loading-screen").style.display = "none"
      document.getElementById("app").style.display = "block"
    }
  }

  checkAuth() {
    const token = localStorage.getItem("mg_auth_token")
    const user = this.authManager.validateToken(token)

    if (user) {
      this.currentUser = user
      this.showPOSInterface()
    } else {
      this.showLoginScreen()
    }
  }

  showLoginScreen() {
    document.getElementById("login-screen").style.display = "flex"
    document.getElementById("pos-interface").classList.add("hidden")
  }

  showPOSInterface() {
    document.getElementById("login-screen").style.display = "none"
    document.getElementById("pos-interface").classList.remove("hidden")

    // Afficher les informations utilisateur
    document.getElementById("user-info").textContent = this.currentUser.email

    // Charger les produits
    this.loadProducts()
  }

  setupEventListeners() {
    // Formulaire de connexion
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Déconnexion
    document.getElementById("logout-btn").addEventListener("click", () => {
      this.authManager.logout()
    })

    // Recherche de produits
    document.getElementById("product-search").addEventListener("input", (e) => {
      this.searchProducts(e.target.value)
    })

    // Ajouter un produit
    document.getElementById("add-product-btn").addEventListener("click", () => {
      this.showAddProductModal()
    })

    // Modal d'ajout de produit
    document.getElementById("add-product-form").addEventListener("submit", (e) => {
      e.preventDefault()
      this.addNewProduct()
    })

    document.getElementById("cancel-add-product").addEventListener("click", () => {
      this.hideAddProductModal()
    })

    // Paiements
    document.getElementById("payment-cash").addEventListener("click", () => {
      this.processPayment("cash")
    })

    document.getElementById("payment-card").addEventListener("click", () => {
      this.processPayment("card")
    })

    document.getElementById("payment-d17").addEventListener("click", () => {
      this.processPayment("d17")
    })

    // Détection de connexion
    window.addEventListener("online", () => {
      this.isOnline = true
      this.updateConnectionStatus()
      this.syncOfflineData()
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      this.updateConnectionStatus()
    })

    // Raccourcis clavier
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "f":
            e.preventDefault()
            document.getElementById("product-search").focus()
            break
          case "n":
            e.preventDefault()
            this.showAddProductModal()
            break
        }
      }
    })
  }

  async handleLogin() {
    const email = document.getElementById("email").value
    const serial = document.getElementById("serial").value
    const loginBtn = document.getElementById("login-btn")
    const loginText = document.getElementById("login-text")
    const loginSpinner = document.getElementById("login-spinner")

    // Afficher le spinner
    loginText.textContent = "Connexion..."
    loginSpinner.classList.remove("hidden")
    loginBtn.disabled = true

    try {
      let result

      if (this.isOnline) {
        result = await this.authManager.authenticateOnline(email, serial)
      } else {
        result = this.authManager.authenticateLocal(email, serial)
      }

      if (result.success) {
        this.currentUser = result.user
        this.showPOSInterface()
      } else {
        this.showError(result.error || "Identifiants incorrects")
      }
    } catch (error) {
      this.showError("Erreur de connexion")
    } finally {
      // Masquer le spinner
      loginText.textContent = "Se connecter"
      loginSpinner.classList.add("hidden")
      loginBtn.disabled = false
    }
  }

  async loadProducts() {
    try {
      const products = await this.dbManager.getProducts()
      this.displayProducts(products)
    } catch (error) {
      console.error("Erreur chargement produits:", error)
      this.showError("Erreur lors du chargement des produits")
    }
  }

  displayProducts(products) {
    const grid = document.getElementById("products-grid")

    if (products.length === 0) {
      grid.innerHTML = '<p class="text-gray-500 text-center py-8">Aucun produit trouvé</p>'
      return
    }

    const productsHTML = products
      .map(
        (product) => `
            <div class="product-card bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                 data-product-id="${product.id}"
                 onclick="app.addToCart(${product.id})">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-medium text-gray-800 text-sm">${product.name}</h3>
                    <span class="text-blue-600 font-semibold text-sm">${product.price.toFixed(3)} TND</span>
                </div>
                <div class="flex justify-between items-center text-xs text-gray-600">
                    <span>Stock: ${product.stock}</span>
                    ${product.sku ? `<span>SKU: ${product.sku}</span>` : ""}
                </div>
                ${
                  product.stock <= product.min_stock
                    ? '<div class="mt-2 text-xs text-red-600 font-medium">Stock faible</div>'
                    : ""
                }
            </div>
        `,
      )
      .join("")

    grid.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">${productsHTML}</div>`
  }

  async searchProducts(query) {
    if (!query.trim()) {
      this.loadProducts()
      return
    }

    try {
      const allProducts = await this.dbManager.getProducts()
      const filtered = allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          (product.sku && product.sku.toLowerCase().includes(query.toLowerCase())),
      )
      this.displayProducts(filtered)
    } catch (error) {
      console.error("Erreur recherche:", error)
    }
  }

  async addToCart(productId) {
    try {
      const products = await this.dbManager.getProducts()
      const product = products.find((p) => p.id === productId)

      if (!product) {
        this.showError("Produit non trouvé")
        return
      }

      if (product.stock <= 0) {
        this.showError("Produit en rupture de stock")
        return
      }

      // Vérifier si le produit est déjà dans le panier
      const existingItem = this.cart.find((item) => item.id === productId)

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          this.showError("Stock insuffisant")
          return
        }
        existingItem.quantity++
      } else {
        this.cart.push({
          id: productId,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        })
      }

      this.updateCartDisplay()
      this.showSuccessToast(`${product.name} ajouté au panier`)
    } catch (error) {
      console.error("Erreur ajout panier:", error)
      this.showError("Erreur lors de l'ajout au panier")
    }
  }

  updateCartDisplay() {
    const cartItems = document.getElementById("cart-items")
    const cartTotal = document.getElementById("cart-total")

    if (this.cart.length === 0) {
      cartItems.innerHTML = '<p class="text-gray-500 text-center py-8">Panier vide</p>'
      cartTotal.textContent = "0.000 TND"
      return
    }

    const itemsHTML = this.cart
      .map(
        (item) => `
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <div class="flex-1">
                    <div class="font-medium text-sm">${item.name}</div>
                    <div class="text-xs text-gray-600">${item.price.toFixed(3)} TND x ${item.quantity}</div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="app.updateCartQuantity(${item.id}, ${item.quantity - 1})" 
                            class="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300">-</button>
                    <span class="text-sm font-medium">${item.quantity}</span>
                    <button onclick="app.updateCartQuantity(${item.id}, ${item.quantity + 1})" 
                            class="w-6 h-6 bg-gray-200 rounded text-xs hover:bg-gray-300">+</button>
                    <button onclick="app.removeFromCart(${item.id})" 
                            class="w-6 h-6 bg-red-200 text-red-600 rounded text-xs hover:bg-red-300">×</button>
                </div>
            </div>
        `,
      )
      .join("")

    cartItems.innerHTML = itemsHTML

    const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    cartTotal.textContent = `${total.toFixed(3)} TND`
  }

  updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      this.removeFromCart(productId)
      return
    }

    const item = this.cart.find((item) => item.id === productId)
    if (item) {
      if (newQuantity > item.stock) {
        this.showError("Stock insuffisant")
        return
      }
      item.quantity = newQuantity
      this.updateCartDisplay()
    }
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter((item) => item.id !== productId)
    this.updateCartDisplay()
  }

  async processPayment(method) {
    if (this.cart.length === 0) {
      this.showError("Panier vide")
      return
    }

    const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    try {
      // Créer la vente
      const sale = {
        user_id: this.currentUser.id,
        total: total,
        items: this.cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        payment_method: method,
        created_at: new Date().toISOString(),
      }

      await this.dbManager.addSale(sale)

      // Mettre à jour les stocks
      for (const item of this.cart) {
        await this.dbManager.updateProduct(item.id, {
          stock: item.stock - item.quantity,
        })
      }

      // Ajouter à la file de synchronisation si hors ligne
      if (!this.isOnline) {
        await this.dbManager.addToSyncQueue("create_sale", sale)
      }

      // Vider le panier
      this.cart = []
      this.updateCartDisplay()

      // Recharger les produits
      this.loadProducts()

      this.showSuccessToast(`Paiement de ${total.toFixed(3)} TND effectué avec succès`)
    } catch (error) {
      console.error("Erreur paiement:", error)
      this.showError("Erreur lors du paiement")
    }
  }

  showAddProductModal() {
    document.getElementById("add-product-modal").classList.remove("hidden")
  }

  hideAddProductModal() {
    document.getElementById("add-product-modal").classList.add("hidden")
    document.getElementById("add-product-form").reset()
  }

  async addNewProduct() {
    const name = document.getElementById("new-product-name").value
    const sku = document.getElementById("new-product-sku").value
    const price = Number.parseFloat(document.getElementById("new-product-price").value)
    const stock = Number.parseInt(document.getElementById("new-product-stock").value) || 0

    if (!name || !price) {
      this.showError("Nom et prix obligatoires")
      return
    }

    try {
      const product = {
        name,
        sku: sku || null,
        price,
        stock,
        min_stock: Math.max(1, Math.floor(stock * 0.1)),
      }

      await this.dbManager.addProduct(product)

      this.hideAddProductModal()
      this.loadProducts()
      this.showSuccessToast("Produit ajouté avec succès")
    } catch (error) {
      console.error("Erreur ajout produit:", error)
      this.showError("Erreur lors de l'ajout du produit")
    }
  }

  updateConnectionStatus() {
    const indicator = document.getElementById("connection-status")
    const text = document.getElementById("connection-text")

    if (this.isOnline) {
      indicator.classList.add("online-indicator")
      text.textContent = "En ligne"
      setTimeout(() => {
        indicator.style.display = "none"
      }, 2000)
    } else {
      indicator.classList.remove("online-indicator")
      text.textContent = "Mode Hors-ligne"
      indicator.style.display = "block"
    }
  }

  async syncOfflineData() {
    try {
      const syncQueue = await this.dbManager.getSyncQueue()

      for (const item of syncQueue) {
        // Simulation de synchronisation
        console.log("Synchronizing:", item)

        // Marquer comme synchronisé
        await this.dbManager.updateSyncStatus(item.id, "synced")
      }

      if (syncQueue.length > 0) {
        this.showSuccessToast(`${syncQueue.length} éléments synchronisés`)
      }
    } catch (error) {
      console.error("Erreur synchronisation:", error)
    }
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration)

          // Gérer les mises à jour
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                this.showUpdateNotification()
              }
            })
          })
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }
  }

  showUpdateNotification() {
    const notification = document.createElement("div")
    notification.className = "fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50"
    notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <span>Nouvelle version disponible</span>
                <button onclick="this.parentElement.parentElement.remove(); location.reload();" 
                        class="bg-white text-blue-600 px-3 py-1 rounded text-sm">
                    Mettre à jour
                </button>
            </div>
        `
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove()
      }
    }, 10000)
  }

  showError(message) {
    this.showToast(message, "error")
  }

  showSuccessToast(message) {
    this.showToast(message, "success")
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div")
    const bgColor = type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-blue-600"

    toast.className = `fixed bottom-4 left-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50 slide-up`
    toast.textContent = message

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 3000)
  }
}

// Initialiser l'application
let app
document.addEventListener("DOMContentLoaded", () => {
  app = new MGCaisseApp()
  // Exposer l'app globalement pour les interactions
  window.app = app
})
