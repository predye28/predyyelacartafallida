// app.js — Frontend de Predai (Supabase + Vercel)

// Referencias a los elementos del DOM
const btnAdd = document.getElementById('btn-add');
const authSection = document.getElementById('auth-section');
const inputPassword = document.getElementById('input-password');
const btnConfirmPwd = document.getElementById('btn-confirm-password');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const passwordError = document.getElementById('password-error');

const formSection = document.getElementById('form-section');
const noteContent = document.getElementById('note-content');
const btnPublish = document.getElementById('btn-publish');
const btnCancelForm = document.getElementById('btn-cancel-form');
const publishError = document.getElementById('publish-error');

const notesContainer = document.getElementById('notes-container');

// Guardar temporalmente la contraseña validada en memoria
let verifiedPassword = '';

// ─── Utilidades ──────────────────────────────────────────────────

function formatDate(isoString) {
    // Supabase a veces retorna el TIMESTAMP en UTC sin la 'Z'.
    // Si falta, se la agregamos para que JavaScript sepa que es UTC y aplique bien la zona horaria.
    if (!isoString.endsWith('Z')) {
        isoString += 'Z';
    }
    const date = new Date(isoString);
    return date.toLocaleDateString('es-CR', {
        timeZone: 'America/Costa_Rica',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note';
    // Remplazamos saltos de línea y el texto literal '\n' por <br>
    const formattedContent = escapeHtml(note.content)
        .replace(/\\n/g, '<br>')
        .replace(/\n/g, '<br>');

    div.innerHTML = `
    <div class="note-meta">Publicado el ${formatDate(note.created_at)}</div>
    <div class="note-content">${formattedContent}</div>
  `;
    return div;
}

// ─── Cargar Notas ────────────────────────────────────────────────

async function loadNotes() {
    try {
        const res = await fetch('/api/notes');
        const data = await res.json();

        notesContainer.innerHTML = '';

        if (!data.ok || data.notes.length === 0) {
            notesContainer.innerHTML = '<p class="empty-state">No hay escritos disponibles.</p>';
            return;
        }

        data.notes.forEach(note => {
            notesContainer.appendChild(createNoteElement(note));
        });
    } catch (err) {
        notesContainer.innerHTML = '<p class="warning-box">No se pudieron cargar las notas. Fallo de conexión con el servidor.</p>';
        console.error(err);
    }
}

// ─── Lógica de Modales ──────────────────────────────────────────

// Mostrar autenticación
btnAdd.addEventListener('click', () => {
    authSection.classList.remove('hidden');
    btnAdd.parentElement.classList.add('hidden');
    inputPassword.value = '';
    passwordError.classList.add('hidden');
    inputPassword.focus();
});

// Ocultar autenticación
btnCancelModal.addEventListener('click', () => {
    authSection.classList.add('hidden');
    btnAdd.parentElement.classList.remove('hidden');
});

// Validar contraseña
async function verifyPassword() {
    const pwd = inputPassword.value.trim();
    if (!pwd) return;

    btnConfirmPwd.disabled = true;
    btnConfirmPwd.textContent = 'Tratando...';

    try {
        // Verificación enviando la accion verify
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd, action: 'verify' }) // La API valida contraseña sin necesitar nota
        });

        // 401: Contraseña incorrecta
        // 200: Contraseña correcta
        if (res.status === 401) {
            passwordError.classList.remove('hidden');
        } else if (res.ok) {
            // Contraseña correcta
            verifiedPassword = pwd;
            authSection.classList.add('hidden');
            formSection.classList.remove('hidden');
            passwordError.classList.add('hidden');
            noteContent.focus();
        } else {
            throw new Error('Status inesperado');
        }
    } catch (err) {
        passwordError.textContent = 'Error de conexión.';
        passwordError.classList.remove('hidden');
    } finally {
        btnConfirmPwd.disabled = false;
        btnConfirmPwd.textContent = 'Entrar';
    }
}

btnConfirmPwd.addEventListener('click', verifyPassword);
inputPassword.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyPassword();
});

// Ocultar formulario form
btnCancelForm.addEventListener('click', () => {
    formSection.classList.add('hidden');
    btnAdd.parentElement.classList.remove('hidden');
    noteContent.value = '';
    publishError.classList.add('hidden');
    verifiedPassword = ''; // Limpiar
});

// Publicar la nota
btnPublish.addEventListener('click', async () => {
    const content = noteContent.value.trim();
    if (!content) return;

    btnPublish.disabled = true;
    btnPublish.textContent = 'Publicando...';
    publishError.classList.add('hidden');

    try {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: verifiedPassword, content })
        });
        const data = await res.json();

        if (data.ok) {
            // Ocultar form, mostrar botón original
            formSection.classList.add('hidden');
            btnAdd.parentElement.classList.remove('hidden');
            noteContent.value = '';

            // Crear y añadir nota sin recargar (arriba del todo)
            const newCard = createNoteElement(data.note);

            const emptyState = notesContainer.querySelector('.empty-state');
            if (emptyState) emptyState.remove();

            notesContainer.insertBefore(newCard, notesContainer.firstChild);
        } else {
            publishError.textContent = data.error || 'Error al publicar.';
            publishError.classList.remove('hidden');
        }
    } catch (err) {
        publishError.textContent = 'Error de conexión conectando con Supabase.';
        publishError.classList.remove('hidden');
    } finally {
        btnPublish.disabled = false;
        btnPublish.textContent = 'Publicar nota';
    }
});

// Iniciar cargando la lista
loadNotes();
