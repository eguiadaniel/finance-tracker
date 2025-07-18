// Gestión de autenticación
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('financeToken');
    this.user = null;
    this.init();
  }

  async init() {
    if (this.token) {
      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.user = data;
          this.showApp();
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        this.logout();
      }
    } else {
      this.showLogin();
    }
  }

  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('financeToken', this.token);
        
        showNotification('Inicio de sesión exitoso', 'success');
        this.showApp();
        return true;
      } else {
        showNotification(data.error || 'Error al iniciar sesión', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error en login:', error);
      showNotification('Error de conexión', 'error');
      return false;
    }
  }

  async register(userData) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('financeToken', this.token);
        
        showNotification('Registro exitoso', 'success');
        this.showApp();
        return true;
      } else {
        showNotification(data.error || 'Error en el registro', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error en registro:', error);
      showNotification('Error de conexión', 'error');
      return false;
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('financeToken');
    this.showLogin();
    showNotification('Sesión cerrada', 'info');
  }

  showLogin() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  showApp() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    // Mostrar información del usuario
    if (this.user) {
      document.getElementById('userWelcome').textContent = `Hola, ${this.user.username}`;
    }
    
    // Inicializar la aplicación
    if (window.app) {
      window.app.init();
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }
}

// Crear instancia global
const authManager = new AuthManager();

// Funciones para los formularios
function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.querySelector('.tab-btn:first-child');
  const registerTab = document.querySelector('.tab-btn:last-child');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
  }
}

// Event listeners para los formularios
document.addEventListener('DOMContentLoaded', function() {
  // Formulario de login
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
      showNotification('Por favor, completa todos los campos', 'error');
      return;
    }

    const success = await authManager.login(username, password);
    if (success) {
      this.reset();
    }
  });

  // Formulario de registro
  document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validaciones
    if (!username || !email || !password || !confirmPassword) {
      showNotification('Por favor, completa todos los campos', 'error');
      return;
    }

    if (password.length < 6) {
      showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Las contraseñas no coinciden', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Por favor, ingresa un email válido', 'error');
      return;
    }

    const success = await authManager.register({
      username,
      email,
      password
    });

    if (success) {
      this.reset();
    }
  });
});

// Función para cerrar sesión
function logout() {
  authManager.logout();
}

// Exponer authManager globalmente
window.authManager = authManager;