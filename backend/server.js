const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración para la instancia predeterminada (localhost)
const dbConfig = {
    user: 'app_user',
    password: 'User123456!',
    server: 'localhost',
    database: 'AsiloCabezaAlgodon',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Endpoint de Inicio de Sesión
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('usuario', sql.VarChar, usuario)
            .input('password', sql.VarChar, password)
            .query(`
                SELECT u.id_usuario, u.nombre, u.usuario, r.nombre AS rol 
                FROM Usuarios u
                INNER JOIN Roles r ON u.id_rol = r.id_rol
                WHERE u.usuario = @usuario AND u.password = @password AND u.estado = 1
            `);

        if (result.recordset.length > 0) {
            const userFound = result.recordset[0];
            res.json({
                success: true,
                mensaje: "Inicio de sesión exitoso",
                usuario: userFound
            });
        } else {
            res.status(401).json({
                success: false,
                mensaje: "Usuario o contraseña incorrectos"
            });
        }
    } catch (error) {
        console.error("Error en base de datos:", error);
        res.status(500).json({ success: false, mensaje: "Error al conectar con la base de datos" });
    }
});

// --- RUTAS DE PACIENTES Y FAMILIARES ---

// 1. Obtener lista de familiares (para llenar el desplegable y la tabla)
app.get('/api/familiares', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Familiares');
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener familiares:", err.message);
        res.status(500).json([]);
    }
});

// 2. Registrar un nuevo familiar
app.post('/api/familiares', async (req, res) => {
    const { nombre, telefono, correo, direccion } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.VarChar, nombre || '')
            .input('telefono', sql.VarChar, telefono || '')
            .input('correo', sql.VarChar, correo || '')
            .input('direccion', sql.VarChar, direccion || '')
            .query(`INSERT INTO Familiares (nombre, telefono, correo, direccion) 
                   VALUES (@nombre, @telefono, @correo, @direccion)`);
        
        res.json({ mensaje: 'Familiar registrado correctamente' });
    } catch (err) {
        console.error("Error SQL al registrar familiar:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Obtener lista de pacientes con los datos de su familiar
app.get('/api/pacientes', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT p.id_paciente, p.nombre, p.edad, p.psicopatologia, p.medicamentos_cajon, 
                   f.nombre AS nombre_familiar, f.telefono AS telefono_familiar
            FROM Pacientes p
            LEFT JOIN Familiares f ON p.id_familiar = f.id_familiar
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener pacientes:", err.message);
        res.status(500).json([]);
    }
});

// 4. Registrar un nuevo paciente
app.post('/api/pacientes', async (req, res) => {
    const { nombre, edad, psicopatologia, medicamentos_cajon, id_familiar } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.VarChar, nombre || '')
            .input('edad', sql.Int, edad || 0)
            .input('psicopatologia', sql.VarChar, psicopatologia || '')
            .input('medicamentos_cajon', sql.VarChar, medicamentos_cajon || '')
            .input('id_familiar', sql.Int, id_familiar || null)
            .query(`INSERT INTO Pacientes (nombre, edad, psicopatologia, medicamentos_cajon, id_familiar) 
                   VALUES (@nombre, @edad, @psicopatologia, @medicamentos_cajon, @id_familiar)`);
        
        res.json({ mensaje: 'Paciente registrado con éxito' });
    } catch (err) {
        console.error("Error SQL al registrar paciente:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;

// --- RUTAS DE MÉDICOS ---

// 1. Obtener lista de médicos
app.get('/api/medicos', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Medicos');
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener médicos:", err.message);
        res.status(500).json([]);
    }
});

// 2. Registrar un nuevo médico
app.post('/api/medicos', async (req, res) => {
    const { nombre, especialidad, telefono, correo, colegiado } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.VarChar, nombre || '')
            .input('especialidad', sql.VarChar, especialidad || '')
            .input('telefono', sql.VarChar, telefono || '')
            .input('correo', sql.VarChar, correo || '')
            .input('colegiado', sql.VarChar, colegiado || '')
            .query(`INSERT INTO Medicos (nombre, especialidad, telefono, correo, colegiado) 
                   VALUES (@nombre, @especialidad, @telefono, @correo, @colegiado)`);
        
        res.json({ mensaje: 'Médico registrado con éxito' });
    } catch (err) {
        console.error("Error SQL al registrar médico:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE SOLICITUDES MÉDICAS ---

// 1. Obtener todas las solicitudes médicas (con nombres de paciente y médico)
app.get('/api/solicitudes', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT s.id_solicitud, s.fecha, s.motivo, s.estado,
                   p.nombre AS nombre_paciente,
                   m.nombre AS nombre_medico
            FROM SolicitudesMedicas s
            INNER JOIN Pacientes p ON s.id_paciente = p.id_paciente
            INNER JOIN Medicos m ON s.id_medico = m.id_medico
            ORDER BY s.id_solicitud DESC
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener solicitudes:", err.message);
        res.status(500).json([]);
    }
});

// 2. Crear una nueva solicitud médica
app.post('/api/solicitudes', async (req, res) => {
    const { id_paciente, id_medico, fecha, motivo, estado } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_paciente', sql.Int, id_paciente)
            .input('id_medico', sql.Int, id_medico)
            .input('fecha', sql.Date, fecha)
            .input('motivo', sql.VarChar, motivo || '')
            .input('estado', sql.VarChar, estado || 'Pendiente')
            .query(`INSERT INTO SolicitudesMedicas (id_paciente, id_medico, fecha, motivo, estado)
                   VALUES (@id_paciente, @id_medico, @fecha, @motivo, @estado)`);
        
        res.json({ mensaje: 'Solicitud médica creada con éxito' });
    } catch (err) {
        console.error("Error SQL al crear solicitud:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE CITAS MÉDICAS ---

// 1. Obtener lista de citas con información de paciente y médico
app.get('/api/citas', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT c.id_cita, c.fecha, c.hora, c.motivo, c.estado,
                   p.nombre AS nombre_paciente,
                   m.nombre AS nombre_medico
            FROM CitasMedicas c
            INNER JOIN Pacientes p ON c.id_paciente = p.id_paciente
            INNER JOIN Medicos m ON c.id_medico = m.id_medico
            ORDER BY c.fecha DESC, c.hora ASC
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener citas médicas:", err.message);
        res.status(500).json([]);
    }
});

// 2. Registrar una nueva cita médica
app.post('/api/citas', async (req, res) => {
    const { id_paciente, id_medico, fecha, hora, motivo, estado } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_paciente', sql.Int, id_paciente)
            .input('id_medico', sql.Int, id_medico)
            .input('fecha', sql.Date, fecha)
            .input('hora', sql.VarChar, hora || '')
            .input('motivo', sql.VarChar, motivo || '')
            .input('estado', sql.VarChar, estado || 'Programada')
            .query(`INSERT INTO CitasMedicas (id_paciente, id_medico, fecha, hora, motivo, estado)
                   VALUES (@id_paciente, @id_medico, @fecha, @hora, @motivo, @estado)`);
        
        res.json({ mensaje: 'Cita médica agendada con éxito' });
    } catch (err) {
        console.error("Error SQL al agendar cita:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE HISTORIAL MÉDICO ---

// 1. Obtener todos los registros de historial médico
app.get('/api/historial', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT h.id_historial, 
                   h.fecha, 
                   h.medico_tratante, 
                   h.especialidad_medico, 
                   h.motivo_visita, 
                   h.examenes_laboratorio, 
                   h.resultados_examenes, 
                   h.diagnostico, 
                   h.medicamento_aplicado, 
                   h.cantidad_medicamento, 
                   h.tiempo_aplicacion, 
                   h.observaciones,
                   p.nombre AS nombre_paciente
            FROM HistorialMedico h
            INNER JOIN Pacientes p ON h.id_paciente = p.id_paciente
            ORDER BY h.fecha DESC
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener historial médico:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Registrar nueva entrada en el historial médico
app.post('/api/historial', async (req, res) => {
    const { 
        id_paciente, fecha, medico_tratante, especialidad_medico, 
        motivo_visita, examenes_laboratorio, resultados_examenes, 
        diagnostico, medicamento_aplicado, cantidad_medicamento, 
        tiempo_aplicacion, observaciones 
    } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_paciente', sql.Int, parseInt(id_paciente))
            .input('fecha', sql.Date, fecha)
            .input('medico_tratante', sql.VarChar, medico_tratante || '')
            .input('especialidad_medico', sql.VarChar, especialidad_medico || '')
            .input('motivo_visita', sql.VarChar, motivo_visita || '')
            .input('examenes_laboratorio', sql.VarChar, examenes_laboratorio || '')
            .input('resultados_examenes', sql.Text, resultados_examenes || '')
            .input('diagnostico', sql.Text, diagnostico || '')
            .input('medicamento_aplicado', sql.VarChar, medicamento_aplicado || '')
            .input('cantidad_medicamento', sql.VarChar, cantidad_medicamento || '')
            .input('tiempo_aplicacion', sql.VarChar, tiempo_aplicacion || '')
            .input('observaciones', sql.Text, observaciones || '')
            .query(`
                INSERT INTO HistorialMedico 
                (id_paciente, fecha, medico_tratante, especialidad_medico, motivo_visita, 
                 examenes_laboratorio, resultados_examenes, diagnostico, medicamento_aplicado, 
                 cantidad_medicamento, tiempo_aplicacion, observaciones)
                VALUES 
                (@id_paciente, @fecha, @medico_tratante, @especialidad_medico, @motivo_visita, 
                 @examenes_laboratorio, @resultados_examenes, @diagnostico, @medicamento_aplicado, 
                 @cantidad_medicamento, @tiempo_aplicacion, @observaciones)
            `);

        res.json({ mensaje: 'Ficha agregada al historial con éxito' });
    } catch (err) {
        console.error("Error al guardar historial:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE LABORATORIO ---

// 1. Obtener todos los exámenes de laboratorio
app.get('/api/laboratorio', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT l.id_examen, l.tipo_examen, l.fecha, l.resultado, l.estado,
                   p.nombre AS nombre_paciente
            FROM Laboratorio l
            INNER JOIN Pacientes p ON l.id_paciente = p.id_paciente
            ORDER BY l.fecha DESC
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener registros de laboratorio:", err.message);
        res.status(500).json([]);
    }
});

// 2. Registrar nuevo examen de laboratorio
app.post('/api/laboratorio', async (req, res) => {
    const { id_paciente, tipo_examen, fecha, resultado, estado } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_paciente', sql.Int, id_paciente)
            .input('tipo_examen', sql.VarChar, tipo_examen || '')
            .input('fecha', sql.Date, fecha)
            .input('resultado', sql.VarChar, resultado || '')
            .input('estado', sql.VarChar, estado || 'Pendiente')
            .query(`INSERT INTO Laboratorio (id_paciente, tipo_examen, fecha, resultado, estado)
                   VALUES (@id_paciente, @tipo_examen, @fecha, @resultado, @estado)`);
        
        res.json({ mensaje: 'Examen de laboratorio registrado con éxito' });
    } catch (err) {
        console.error("Error SQL al guardar examen:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE FARMACIA ---

// 1. Obtener todos los medicamentos en inventario
app.get('/api/farmacia', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Farmacia ORDER BY nombre ASC');
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener inventario de farmacia:", err.message);
        res.status(500).json([]);
    }
});

// 2. Registrar un nuevo medicamento
app.post('/api/farmacia', async (req, res) => {
    const { nombre, presentacion, stock, precio_unitario, fecha_vencimiento } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.VarChar, nombre || '')
            .input('presentacion', sql.VarChar, presentacion || '')
            .input('stock', sql.Int, parseInt(stock) || 0)
            .input('precio_unitario', sql.Decimal(10, 2), parseFloat(precio_unitario) || 0)
            .input('fecha_vencimiento', sql.Date, fecha_vencimiento || null)
            .query(`INSERT INTO Farmacia (nombre, presentacion, stock, precio_unitario, fecha_vencimiento)
                   VALUES (@nombre, @presentacion, @stock, @precio_unitario, @fecha_vencimiento)`);
        
        res.json({ mensaje: 'Medicamento registrado con éxito' });
    } catch (err) {
        console.error("Error SQL al guardar medicamento:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE FINANZAS Y CAJA ---

// 1. Obtener todas las transacciones financieras
app.get('/api/finanzas', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT f.id_transaccion, f.tipo, f.concepto, f.monto, f.fecha, f.metodo_pago,
                   ISNULL(p.nombre, 'General / Asilo') AS nombre_paciente
            FROM Finanzas f
            LEFT JOIN Pacientes p ON f.id_paciente = p.id_paciente
            ORDER BY f.fecha DESC, f.id_transaccion DESC
        `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al obtener transacciones financieras:", err.message);
        res.status(500).json([]);
    }
});

// 2. Registrar nueva transacción en caja
app.post('/api/finanzas', async (req, res) => {
    const { id_paciente, tipo, concepto, monto, fecha, metodo_pago } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_paciente', sql.Int, id_paciente ? parseInt(id_paciente) : null)
            .input('tipo', sql.VarChar, tipo || 'Ingreso')
            .input('concepto', sql.VarChar, concepto || '')
            .input('monto', sql.Decimal(10, 2), parseFloat(monto) || 0)
            .input('fecha', sql.Date, fecha)
            .input('metodo_pago', sql.VarChar, metodo_pago || 'Efectivo')
            .query(`INSERT INTO Finanzas (id_paciente, tipo, concepto, monto, fecha, metodo_pago)
                   VALUES (@id_paciente, @tipo, @concepto, @monto, @fecha, @metodo_pago)`);
        
        res.json({ mensaje: 'Transacción registrada con éxito' });
    } catch (err) {
        console.error("Error SQL al registrar transacción:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- RUTAS DE REPORTES Y DASHBOARD ---

// 1. Obtener métricas generales para las tarjetas del Dashboard
app.get('/api/reportes/resumen', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const pacientes = await pool.request().query('SELECT COUNT(*) AS total FROM Pacientes');
        const ingresos = await pool.request().query("SELECT ISNULL(SUM(monto), 0) AS total FROM Finanzas WHERE tipo = 'Ingreso'");
        const egresos = await pool.request().query("SELECT ISNULL(SUM(monto), 0) AS total FROM Finanzas WHERE tipo = 'Egreso'");
        const stockBajo = await pool.request().query('SELECT COUNT(*) AS total FROM Farmacia WHERE stock < 10');

        res.json({
            totalPacientes: pacientes.recordset[0].total,
            totalIngresos: ingresos.recordset[0].total,
            totalEgresos: egresos.recordset[0].total,
            alertasStock: stockBajo.recordset[0].total
        });
    } catch (err) {
        console.error("Error al obtener resumen de reportes:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Reporte financiero filtrado por rango de fechas
app.get('/api/reportes/finanzas', async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('fecha_inicio', sql.Date, fecha_inicio)
            .input('fecha_fin', sql.Date, fecha_fin)
            .query(`
                SELECT f.id_transaccion, f.tipo, f.concepto, f.monto, f.fecha, f.metodo_pago,
                       ISNULL(p.nombre, 'General / Asilo') AS nombre_paciente
                FROM Finanzas f
                LEFT JOIN Pacientes p ON f.id_paciente = p.id_paciente
                WHERE f.fecha BETWEEN @fecha_inicio AND @fecha_fin
                ORDER BY f.fecha DESC
            `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al filtrar reporte de finanzas:", err.message);
        res.status(500).json([]);
    }
});

// 3. Reporte de exámenes de laboratorio filtrado por rango de fechas
app.get('/api/reportes/laboratorio', async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('fecha_inicio', sql.Date, fecha_inicio)
            .input('fecha_fin', sql.Date, fecha_fin)
            .query(`
                SELECT l.id_examen, l.tipo_examen, l.fecha, l.resultado, l.estado,
                       p.nombre AS nombre_paciente
                FROM Laboratorio l
                INNER JOIN Pacientes p ON l.id_paciente = p.id_paciente
                WHERE l.fecha BETWEEN @fecha_inicio AND @fecha_fin
                ORDER BY l.fecha DESC
            `);
        res.json(result.recordset || []);
    } catch (err) {
        console.error("Error al filtrar reporte de laboratorio:", err.message);
        res.status(500).json([]);
    }
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});