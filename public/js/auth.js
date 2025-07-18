// Sistema de notificaciones (versión temporal para auth)
function showNotification(message, type = 'info') {
  // Si la función global ya existe, usarla
  if (window.showNotification && window.showNotification !== showNotification) {
    return window.showNotification(message, type);
  }
  
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  notification.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 15px;">&times;</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove después de 5 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

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
      const welcomeText = this.user.username === 'demo' ? 
        `🚀 Modo Demo` : 
        `Hola, ${this.user.username}`;
      document.getElementById('userWelcome').textContent = welcomeText;
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

// Crear instancia global después de que el DOM esté listo
let authManager;

// Inicializar después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  authManager = new AuthManager();
  window.authManager = authManager;
  
  // Event listeners para los tabs
  document.getElementById('loginTabBtn').addEventListener('click', function() {
    switchTab('login');
  });
  
  document.getElementById('registerTabBtn').addEventListener('click', function() {
    switchTab('register');
  });
  
  // Event listener para el botón demo
  document.getElementById('demoLoginBtn').addEventListener('click', function() {
    loginAsDemo();
  });
  
  // Event listener para logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      logout();
    });
  }
  
  // Event listeners para los formularios
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

// Función para login como demo
async function loginAsDemo() {
  if (!authManager) {
    showNotification('Error: Sistema no inicializado', 'error');
    return;
  }
  
  const success = await authManager.login('demo', 'demo123');
  if (success) {
    showNotification('¡Bienvenido al modo demo! 🚀', 'success');
    // Agregar notificación adicional sobre el modo demo
    setTimeout(() => {
      showNotification('Modo Demo: Tus datos se guardan temporalmente y pueden ser reiniciados', 'info');
    }, 2000);
  }
}

// Función para cerrar sesión
function logout() {
  authManager.logout();
}

// Exponer funciones globalmente
window.authManager = authManager;
window.loginAsDemo = loginAsDemo;
window.showNotification = showNotification;
window.switchTab = switchTab;
window.logout = logout;