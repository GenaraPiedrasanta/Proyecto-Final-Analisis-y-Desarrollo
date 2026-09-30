document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const usuarioInput = document.getElementById("usuario").value;
    const passwordInput = document.getElementById("password").value;
    const mensaje = document.getElementById("mensaje");

    mensaje.textContent = "Verificando credenciales...";
    mensaje.style.color = "#333";

    try {
        // Petición a la API que acabamos de encender en el puerto 3000
        const respuesta = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ usuario: usuarioInput, password: passwordInput })
        });

        const data = await respuesta.json();

        if (data.success) {
            mensaje.textContent = `¡Bienvenido ${data.usuario.nombre}!`;
            mensaje.style.color = "green";

            // Guardar los datos de sesión en el navegador
            sessionStorage.setItem("usuarioAutenticado", JSON.stringify(data.usuario));

            // Redireccionar al sistema tras 1 segundo
            setTimeout(function() {
                window.location.href = "inicio.html";
            }, 1000);
        } else {
            mensaje.textContent = data.mensaje;
            mensaje.style.color = "#c0392b";
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        mensaje.textContent = "Error de conexión con el servidor backend";
        mensaje.style.color = "#c0392b";
    }
});