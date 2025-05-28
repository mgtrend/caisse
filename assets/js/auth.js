// auth.js - Authentification hybride
class AuthManager {
  constructor() {
    this.apiUrl = "https://api.supabase.co/rest/v1" // API gratuite
    this.apiKey = "YOUR_SUPABASE_KEY"
    this.localUsers = this.loadLocalUsers()
    console.log("AuthManager initialisé avec", this.localUsers.length, "utilisateurs locaux")
  }

  // Authentification locale pour mode hors-ligne
  authenticateLocal(email, serialNumber) {
    console.log("Tentative d'authentification locale:", email, serialNumber)
    const user = this.localUsers.find((u) => u.email === email && u.serial_number === serialNumber)

    if (user) {
      console.log("Utilisateur local trouvé:", user)
      const token = this.generateToken(user)
      localStorage.setItem("mg_auth_token", token)
      return { success: true, token, user }
    }

    console.log("Utilisateur local non trouvé")
    return { success: false, error: "Utilisateur non trouvé" }
  }

  // Authentification via API externe
  async authenticateOnline(email, serialNumber) {
    try {
      console.log("Tentative d'authentification en ligne:", email, serialNumber)

      // Simuler une authentification réussie pour les comptes de test
      const testUser = this.localUsers.find((u) => u.email === email && u.serial_number === serialNumber)
      if (testUser) {
        console.log("Utilisateur de test trouvé, authentification simulée")
        const token = this.generateToken(testUser)
        localStorage.setItem("mg_auth_token", token)
        return { success: true, token, user: testUser }
      }

      // Authentification API réelle (désactivée pour le moment)
      /*
      const response = await fetch(`${this.apiUrl}/users`, {
        method: "POST",
        headers: {
          apikey: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, serial_number: serialNumber }),
      })

      const data = await response.json()

      if (data.length > 0) {
        const token = this.generateToken(data[0])
        localStorage.setItem("mg_auth_token", token)
        return { success: true, token, user: data[0] }
      }
      */

      console.log("Utilisateur non trouvé en ligne")
      return { success: false, error: "Identifiants invalides" }
    } catch (error) {
      console.error("Erreur d'authentification en ligne:", error)
      // Fallback sur authentification locale
      return this.authenticateLocal(email, serialNumber)
    }
  }

  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      serial: user.serial_number,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
    }
    return btoa(JSON.stringify(payload))
  }

  validateToken(token) {
    try {
      if (!token) {
        console.log("Pas de token trouvé")
        return null
      }

      const payload = JSON.parse(atob(token))
      const isValid = payload.exp > Date.now()

      console.log("Validation du token:", isValid ? "valide" : "expiré")
      return isValid ? payload : null
    } catch (error) {
      console.error("Erreur de validation du token:", error)
      return null
    }
  }

  loadLocalUsers() {
    // Utilisateurs de démonstration
    return [
      {
        id: 1,
        email: "test@mgcaisse.tn",
        serial_number: "MG2024001",
        name: "Utilisateur Test",
        is_active: true,
      },
      {
        id: 2,
        email: "demo@mgcaisse.tn",
        serial_number: "MG2024002",
        name: "Compte Démo",
        is_active: true,
      },
    ]
  }

  logout() {
    localStorage.removeItem("mg_auth_token")
    window.location.reload()
  }
}

// Exporter la classe pour l'utiliser dans d'autres fichiers
window.AuthManager = AuthManager
