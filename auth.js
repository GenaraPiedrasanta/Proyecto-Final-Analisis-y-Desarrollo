// Verifica si hay sesión activa
if (!sessionStorage.getItem("usuarioAutenticado")) {
    window.location.href = "index.html";
}