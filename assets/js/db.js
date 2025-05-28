// db.js - Gestionnaire IndexedDB
class DatabaseManager {
  constructor() {
    this.dbName = "MGCaisseDB"
    this.version = 1
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = (event) => {
        console.error("Erreur d'ouverture de la base de données:", event.target.error)
        reject(event.target.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("Base de données initialisée avec succès")
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        console.log("Mise à niveau de la base de données...")
        const db = event.target.result

        // Store des produits
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", {
            keyPath: "id",
            autoIncrement: true,
          })
          productStore.createIndex("name", "name", { unique: false })
          productStore.createIndex("sku", "sku", { unique: true })
          productStore.createIndex("barcode", "barcode", { unique: true })
          console.log("Store 'products' créé")
        }

        // Store des ventes
        if (!db.objectStoreNames.contains("sales")) {
          const salesStore = db.createObjectStore("sales", {
            keyPath: "id",
            autoIncrement: true,
          })
          salesStore.createIndex("date", "created_at", { unique: false })
          salesStore.createIndex("total", "total", { unique: false })
          console.log("Store 'sales' créé")
        }

        // Store de synchronisation
        if (!db.objectStoreNames.contains("sync_queue")) {
          const syncStore = db.createObjectStore("sync_queue", {
            keyPath: "id",
            autoIncrement: true,
          })
          syncStore.createIndex("status", "status", { unique: false })
          console.log("Store 'sync_queue' créé")
        }

        // Insérer des données de test
        this.insertTestData(db)
      }
    })
  }

  insertTestData(db) {
    try {
      const transaction = db.transaction(["products"], "readwrite")
      const store = transaction.objectStore("products")

      const testProducts = [
        { name: "Pain", sku: "PAIN001", price: 0.5, stock: 100, min_stock: 10 },
        { name: "Lait", sku: "LAIT001", price: 1.2, stock: 50, min_stock: 5 },
        { name: "Café", sku: "CAFE001", price: 2.5, stock: 30, min_stock: 5 },
        { name: "Eau 1.5L", sku: "EAU001", price: 0.8, stock: 80, min_stock: 10 },
        { name: "Biscuits", sku: "BISC001", price: 1.8, stock: 40, min_stock: 8 },
      ]

      testProducts.forEach((product) => store.add(product))
      console.log("Données de test insérées")
    } catch (error) {
      console.error("Erreur lors de l'insertion des données de test:", error)
    }
  }

  // CRUD Operations
  async addProduct(product) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["products"], "readwrite")
      const store = transaction.objectStore("products")

      const request = store.add({
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getProducts(limit = 50) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["products"], "readonly")
      const store = transaction.objectStore("products")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result.slice(0, limit))
      request.onerror = () => reject(request.error)
    })
  }

  async updateProduct(id, updates) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["products"], "readwrite")
      const store = transaction.objectStore("products")

      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const product = getRequest.result
        if (product) {
          const updatedProduct = {
            ...product,
            ...updates,
            updated_at: new Date().toISOString(),
          }

          const updateRequest = store.put(updatedProduct)
          updateRequest.onsuccess = () => resolve(updateRequest.result)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          reject(new Error("Produit non trouvé"))
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteSoftProduct(id) {
    return this.updateProduct(id, { is_deleted: true })
  }

  async addSale(sale) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sales"], "readwrite")
      const store = transaction.objectStore("sales")

      const request = store.add({
        ...sale,
        created_at: new Date().toISOString(),
      })

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getSales(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sales"], "readonly")
      const store = transaction.objectStore("sales")
      const index = store.index("date")

      const request = index.getAll(
        IDBKeyRange.bound(startDate || new Date(0).toISOString(), endDate || new Date().toISOString()),
      )

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Synchronisation
  async addToSyncQueue(action, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sync_queue"], "readwrite")
      const store = transaction.objectStore("sync_queue")

      const request = store.add({
        action,
        data,
        status: "pending",
        created_at: new Date().toISOString(),
      })

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncQueue() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sync_queue"], "readonly")
      const store = transaction.objectStore("sync_queue")
      const index = store.index("status")

      const request = index.getAll("pending")

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateSyncStatus(id, status) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sync_queue"], "readwrite")
      const store = transaction.objectStore("sync_queue")

      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const item = getRequest.result
        if (item) {
          item.status = status
          item.updated_at = new Date().toISOString()

          const updateRequest = store.put(item)
          updateRequest.onsuccess = () => resolve(updateRequest.result)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          reject(new Error("Item non trouvé"))
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }
}

// Exporter la classe pour l'utiliser dans d'autres fichiers
window.DatabaseManager = DatabaseManager
