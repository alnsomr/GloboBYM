// ═══════════════════════════════════════════════════
//  CONFIGURACIÓN FIREBASE — editar con tus datos
// ═══════════════════════════════════════════════════
//
//  PASOS (5 minutos):
//  1. Ve a https://console.firebase.google.com
//  2. Clic en "Crear un proyecto" → nombre: GloboBYM → continuar
//  3. En el panel del proyecto → clic en el ícono </> (Web)
//  4. Apodo: "globobym-web" → clic en "Registrar app"
//  5. Copia los valores de firebaseConfig y pégalos abajo
//  6. En el menú lateral → Firestore Database → Crear base de datos
//     → Modo de producción → elige la región más cercana (us-east1)
//  7. Ve a Reglas y pega esto:
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /pedidos/{id} {
//           allow create: true;
//           allow read, update, delete: if request.auth != null;
//         }
//       }
//     }
//
//  8. En el menú lateral → Authentication → Comenzar
//     → Método de acceso → Email/contraseña → Habilitar
//  9. En Authentication → Usuarios → Agregar usuario
//     → escribe tu email y una contraseña → Agregar
// 10. ¡Listo! Guarda este archivo y abre admin.html

const firebaseConfig = {
  apiKey:            "AIzaSyDDRomYCtRzPkCLbWlqlgRNnQ8aSj2izQ4",
  authDomain:        "globobym.firebaseapp.com",
  projectId:         "globobym",
  storageBucket:     "globobym.firebasestorage.app",
  messagingSenderId: "499147123529",
  appId:             "1:499147123529:web:ad69e31c0dbeabdcc20898"
};
